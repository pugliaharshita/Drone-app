import { Handler } from '@netlify/functions';
import crypto from 'crypto';
import * as XLSX from 'xlsx';
import jwt from 'jsonwebtoken';
import querystring from 'querystring';

// Get client credentials from environment variables
const DEFAULT_CLIENT_ID = process.env.DEFAULT_CLIENT_ID || 'fdgsbu3498n48uc64';
const DEFAULT_CLIENT_SECRET = process.env.DEFAULT_CLIENT_SECRET;
const DOCUSIGN_CALLBACK_URL = 'https://demo.services.docusign.net/act-gateway/v1.0/oauth/callback';

if (!DEFAULT_CLIENT_ID || !DEFAULT_CLIENT_SECRET) {
  throw new Error('DEFAULT_CLIENT_ID and DEFAULT_CLIENT_SECRET environment variables must be set');
}

// Store client credentials and authorization codes
const clients: { [key: string]: { clientSecret: string, name: string } } = {
  [DEFAULT_CLIENT_ID]: {
    clientSecret: DEFAULT_CLIENT_SECRET,
    name: 'Sample Extension App'
  }
};

// Store authorization codes temporarily with additional data
interface AuthCodeData {
  clientId: string;
  redirectUri: string;
  expiresAt: number;
  state?: string;
  scope?: string;
  access_type?: string;
}

const authCodes = new Map<string, AuthCodeData>();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable must be set');
}

const generateToken = (clientId: string, scope?: string): string => {
  return jwt.sign({ 
    clientId,
    scope: scope || 'signature'
  }, JWT_SECRET, { 
    expiresIn: '1h',
    audience: clientId,
    issuer: 'https://droneextensionapp.netlify.app'
  });
};

const verifyToken = async (token: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, {
      issuer: 'https://droneextensionapp.netlify.app'
    }, (err, decoded) => {
      if (err) reject(err);
      else resolve(decoded);
    });
  });
};

const generateAuthCode = (clientId: string, redirectUri: string, state?: string, scope?: string, access_type?: string): string => {
  const code = crypto.randomBytes(32).toString('hex');
  // Authorization code expires in 10 minutes
  authCodes.set(code, {
    clientId,
    redirectUri,
    expiresAt: Date.now() + 10 * 60 * 1000,
    state,
    scope,
    access_type
  });
  return code;
};

const verifyCodeChallenge = (codeVerifier: string, storedChallenge: string, method: string): boolean => {
  if (method === 'S256') {
    const hash = crypto.createHash('sha256')
      .update(codeVerifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    return hash === storedChallenge;
  }
  return codeVerifier === storedChallenge;
};

export const handler: Handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  try {
    // Authorization endpoint
    if (event.httpMethod === 'GET' && event.path === '/.netlify/functions/oauth/authorize') {
      const { 
        client_id, 
        redirect_uri, 
        response_type, 
        state,
        scope,
        prompt,
        access_type
      } = event.queryStringParameters || {};

      if (!client_id || response_type !== 'code') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'invalid_request',
            error_description: 'Missing required parameters'
          })
        };
      }

      // Verify client exists
      if (!clients[client_id]) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ 
            error: 'unauthorized_client',
            error_description: 'Invalid client'
          })
        };
      }

      // Verify prompt is consent if provided
      if (prompt && prompt !== 'consent') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'invalid_request',
            error_description: 'Invalid prompt parameter'
          })
        };
      }

      // Generate authorization code
      const code = generateAuthCode(
        client_id, 
        DOCUSIGN_CALLBACK_URL,
        state,
        scope,
        access_type
      );

      // Redirect back to DocuSign with the authorization code
      const redirectUrl = new URL(DOCUSIGN_CALLBACK_URL);
      redirectUrl.searchParams.append('code', code);
      if (state) {
        redirectUrl.searchParams.append('state', state);
      }

      return {
        statusCode: 302,
        headers: {
          ...headers,
          'Location': redirectUrl.toString()
        }
      };
    }

    // Token endpoint
    if (event.httpMethod === 'POST' && event.path === '/.netlify/functions/oauth/token') {
      console.log('Token endpoint accessed');
      console.log('Request headers:', event.headers);
      
      let client_id, client_secret;
      
      // Check for Basic auth first
      const authHeader = event.headers.authorization;
      if (authHeader && authHeader.startsWith('Basic ')) {
        console.log('Found Basic auth header');
        const base64Credentials = authHeader.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
        [client_id, client_secret] = credentials.split(':');
        console.log('Extracted client credentials from Basic auth');
      }

      // Parse form data
      const contentType = event.headers['content-type'] || '';
      let params: any;

      if (contentType.includes('application/x-www-form-urlencoded')) {
        params = querystring.parse(event.body || '');
      } else {
        try {
          params = JSON.parse(event.body || '{}');
        } catch {
          params = {};
        }
      }

      // If no Basic auth, try body params
      if (!client_id || !client_secret) {
        client_id = params.client_id;
        client_secret = params.client_secret;
      }

      const { grant_type, code } = params;

      // Validate client credentials
      const client = clients[client_id];
      if (!client || client.clientSecret !== client_secret) {
        console.log('Invalid client credentials');
        return {
          statusCode: 401,
          headers: {
            ...headers,
            'WWW-Authenticate': 'Basic realm="OAuth"'
          },
          body: JSON.stringify({ 
            error: 'invalid_client',
            error_description: 'Invalid client credentials'
          })
        };
      }

      // Handle authorization code grant
      if (grant_type === 'authorization_code') {
        if (!code) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: 'invalid_request',
              error_description: 'Authorization code is required'
            })
          };
        }

        // Verify authorization code
        const authCodeData = authCodes.get(code);
        if (!authCodeData || authCodeData.expiresAt < Date.now()) {
          authCodes.delete(code);
          console.log('Invalid or expired authorization code');
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: 'invalid_grant',
              error_description: 'Invalid or expired authorization code'
            })
          };
        }

        // Verify client ID matches
        if (authCodeData.clientId !== client_id) {
          console.log('Client ID mismatch');
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: 'invalid_grant',
              error_description: 'Authorization code was not issued to this client'
            })
          };
        }

        // Generate token
        const token = generateToken(authCodeData.clientId, authCodeData.scope);
        
        // Remove used authorization code
        authCodes.delete(code);

        // Generate refresh token if offline access was requested
        const response: any = {
          access_token: token,
          token_type: 'Bearer',
          expires_in: 3600,
          scope: authCodeData.scope || 'signature'
        };

        if (authCodeData.access_type === 'offline') {
          response.refresh_token = crypto.randomBytes(32).toString('hex');
        }

        console.log('Token response:', { ...response, access_token: '[REDACTED]' });

        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Cache-Control': 'no-store',
            'Pragma': 'no-cache'
          },
          body: JSON.stringify(response)
        };
      }

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'unsupported_grant_type',
          error_description: 'Supported grant types: authorization_code'
        })
      };
    }

    // Verify mobile endpoint
    if (event.httpMethod === 'POST' && event.path === '/.netlify/functions/oauth/verify-mobile') {
      const authHeader = event.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Missing or invalid authorization header' })
        };
      }

      const token = authHeader.split(' ')[1];
      try {
        await verifyToken(token);
      } catch (error) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Invalid token' })
        };
      }

      const { mobileNumber, excelFile } = JSON.parse(event.body || '{}');
      
      if (!excelFile || !mobileNumber) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Excel file and mobile number are required' })
        };
      }

      // Read the Excel file
      const buffer = Buffer.from(excelFile, 'base64');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      // Search for the mobile number
      const found = data.some((row: any) => {
        const rowMobileNumber = row.mobileNumber?.toString() || row.mobile?.toString() || row['mobile number']?.toString();
        return rowMobileNumber === mobileNumber.toString();
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          verified: found,
          message: found ? 'Mobile number verified successfully' : 'Mobile number not found in records'
        })
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ 
        error: 'not_found',
        error_description: 'Endpoint not found'
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'server_error',
        error_description: 'Internal server error'
      })
    };
  }
}; 