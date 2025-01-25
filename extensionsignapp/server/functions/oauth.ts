import { Handler } from '@netlify/functions';
import crypto from 'crypto';
import * as XLSX from 'xlsx';
import jwt from 'jsonwebtoken';

// Get client credentials from environment variables
const DEFAULT_CLIENT_ID = process.env.DEFAULT_CLIENT_ID;
const DEFAULT_CLIENT_SECRET = process.env.DEFAULT_CLIENT_SECRET;

if (!DEFAULT_CLIENT_ID || !DEFAULT_CLIENT_SECRET) {
  throw new Error('DEFAULT_CLIENT_ID and DEFAULT_CLIENT_SECRET environment variables must be set');
}

// Store client credentials
const clients: { [key: string]: { clientSecret: string, name: string } } = {
  [DEFAULT_CLIENT_ID]: {
    clientSecret: DEFAULT_CLIENT_SECRET,
    name: 'Default Extension Client'
  }
};

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable must be set');
}

const generateToken = (clientId: string): string => {
  return jwt.sign({ clientId }, JWT_SECRET, { expiresIn: '1h' });
};

const verifyToken = async (token: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) reject(err);
      else resolve(decoded);
    });
  });
};

const handler: Handler = async (event, context) => {
  const path = event.path.replace('/.netlify/functions/oauth', '');
  const method = event.httpMethod;

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Handle OPTIONS request
  if (method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  try {
    // Token endpoint
    if (method === 'POST' && path === '/token') {
      const authHeader = event.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Basic ')) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Invalid authorization header' })
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
          body: JSON.stringify({ error: 'Invalid client credentials' })
        };
      }

      const token = generateToken(clientId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          access_token: token,
          token_type: 'Bearer',
          expires_in: 3600
        })
      };
    }

    // Verify mobile endpoint
    if (method === 'POST' && path === '/verify-mobile') {
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

      // Parse multipart form data
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
      body: JSON.stringify({ error: 'Not found' })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

export { handler }; 