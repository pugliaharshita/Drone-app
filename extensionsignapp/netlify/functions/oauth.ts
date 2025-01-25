import { Handler } from '@netlify/functions';
import crypto from 'crypto';
import * as XLSX from 'xlsx';
import jwt from 'jsonwebtoken';
import querystring from 'querystring';

// Get client credentials from environment variables
const DEFAULT_CLIENT_ID = process.env.DEFAULT_CLIENT_ID;
const DEFAULT_CLIENT_SECRET = process.env.DEFAULT_CLIENT_SECRET;

if (!DEFAULT_CLIENT_ID || !DEFAULT_CLIENT_SECRET) {
  throw new Error('DEFAULT_CLIENT_ID and DEFAULT_CLIENT_SECRET environment variables must be set');
}

// Store client credentials and authorization codes
const clients: { [key: string]: { clientSecret: string, name: string } } = {
  [DEFAULT_CLIENT_ID]: {
    clientSecret: DEFAULT_CLIENT_SECRET,
    name: 'Default Extension Client'
  }
};

// Store authorization codes temporarily with additional data
interface AuthCodeData {
  clientId: string;
  redirectUri: string;
  expiresAt: number;
  codeChallenge?: string;
  codeChallengeMethod?: string;
}

const authCodes = new Map<string, AuthCodeData>();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable must be set');
}

const generateToken = (clientId: string, scope?: string): string => {
  return jwt.sign({ 
    clientId,
    scope: scope || 'mobile_verify'
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

const generateAuthCode = (clientId: string, redirectUri: string, codeChallenge?: string, codeChallengeMethod?: string): string => {
  const code = crypto.randomBytes(32).toString('hex');
  // Authorization code expires in 10 minutes
  authCodes.set(code, {
    clientId,
    redirectUri,
    expiresAt: Date.now() + 10 * 60 * 1000,
    codeChallenge,
    codeChallengeMethod
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
        code_challenge,
        code_challenge_method,
        scope 
      } = event.queryStringParameters || {};

      if (!client_id || !redirect_uri || response_type !== 'code') {
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

      // Validate redirect URI (you should implement proper URI validation)
      try {
        new URL(redirect_uri);
      } catch (e) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'invalid_request',
            error_description: 'Invalid redirect URI'
          })
        };
      }

      // Generate authorization code
      const code = generateAuthCode(
        client_id, 
        redirect_uri,
        code_challenge,
        code_challenge_method
      );

      // Redirect back to the client with the authorization code
      const redirectUrl = new URL(redirect_uri);
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

      const {
        grant_type,
        code,
        redirect_uri,
        client_id,
        client_secret,
        code_verifier
      } = params;

      // Handle authorization code grant
      if (grant_type === 'authorization_code') {
        if (!code || !redirect_uri || !client_id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: 'invalid_request',
              error_description: 'Missing required parameters'
            })
          };
        }

        // Verify authorization code
        const authCodeData = authCodes.get(code);
        if (!authCodeData || authCodeData.expiresAt < Date.now()) {
          authCodes.delete(code);
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: 'invalid_grant',
              error_description: 'Invalid or expired authorization code'
            })
          };
        }

        // Verify client credentials
        const client = clients[client_id];
        if (!client || client.clientSecret !== client_secret) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ 
              error: 'invalid_client',
              error_description: 'Invalid client credentials'
            })
          };
        }

        // Verify redirect URI matches
        if (authCodeData.redirectUri !== redirect_uri) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: 'invalid_grant',
              error_description: 'Redirect URI mismatch'
            })
          };
        }

        // Verify PKCE if used
        if (authCodeData.codeChallenge && authCodeData.codeChallengeMethod) {
          if (!code_verifier) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ 
                error: 'invalid_grant',
                error_description: 'Code verifier required'
              })
            };
          }

          if (!verifyCodeChallenge(code_verifier, authCodeData.codeChallenge, authCodeData.codeChallengeMethod)) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ 
                error: 'invalid_grant',
                error_description: 'Code verifier mismatch'
              })
            };
          }
        }

        // Generate token
        const token = generateToken(authCodeData.clientId);
        
        // Remove used authorization code
        authCodes.delete(code);

        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Cache-Control': 'no-store',
            'Pragma': 'no-cache'
          },
          body: JSON.stringify({
            access_token: token,
            token_type: 'Bearer',
            expires_in: 3600,
            scope: 'mobile_verify'
          })
        };
      }
      
      // Handle client credentials grant
      if (grant_type === 'client_credentials') {
        const authHeader = event.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Basic ')) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ 
              error: 'invalid_client',
              error_description: 'Invalid authorization header'
            })
          };
        }

        const credentials = Buffer.from(authHeader.split(' ')[1], 'base64')
          .toString()
          .split(':');
        
        const [clientId, clientSecret] = credentials;
        const client = clients[clientId];

        if (!client || client.clientSecret !== clientSecret) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ 
              error: 'invalid_client',
              error_description: 'Invalid client credentials'
            })
          };
        }

        const token = generateToken(clientId);
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Cache-Control': 'no-store',
            'Pragma': 'no-cache'
          },
          body: JSON.stringify({
            access_token: token,
            token_type: 'Bearer',
            expires_in: 3600,
            scope: 'mobile_verify'
          })
        };
      }

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'unsupported_grant_type',
          error_description: 'Unsupported grant type'
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