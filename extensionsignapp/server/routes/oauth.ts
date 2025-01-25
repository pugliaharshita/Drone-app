import express, { Request } from 'express';
import crypto from 'crypto';
import multer from 'multer';
import { generateToken, verifyClientCredentials } from '../services/auth';
import { validateToken } from '../middleware/auth';
import * as XLSX from 'xlsx';

interface FileRequest extends Request {
  file?: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
  };
}

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Store client credentials (in production, use a proper database)
const clients: { [key: string]: { clientSecret: string, name: string } } = {};

// Register new client
router.post('/register', (req, res) => {
  const { name } = req.body;
  const clientId = crypto.randomBytes(16).toString('hex');
  const clientSecret = crypto.randomBytes(32).toString('hex');

  clients[clientId] = {
    clientSecret,
    name
  };

  res.json({
    clientId,
    clientSecret,
    name
  });
});

// Mobile number verification endpoint
router.post('/verify-mobile', validateToken, upload.single('excelFile'), async (req: FileRequest, res) => {
  try {
    const { mobileNumber } = req.body;
    const excelFile = req.file;
    
    if (!excelFile || !mobileNumber) {
      return res.status(400).json({ error: 'Excel file and mobile number are required' });
    }

    // Read the Excel file
    const workbook = XLSX.read(excelFile.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Search for the mobile number in the Excel data
    const found = data.some((row: any) => {
      const rowMobileNumber = row.mobileNumber?.toString() || row.mobile?.toString() || row['mobile number']?.toString();
      return rowMobileNumber === mobileNumber.toString();
    });

    res.json({
      verified: found,
      message: found ? 'Mobile number verified successfully' : 'Mobile number not found in records'
    });
  } catch (error) {
    console.error('Mobile verification error:', error);
    res.status(500).json({ error: 'Error verifying mobile number' });
  }
});

// Token endpoint - Client Credentials Grant
router.post('/token', async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Invalid authorization header' });
  }

  try {
    const credentials = Buffer.from(authHeader.split(' ')[1], 'base64')
      .toString()
      .split(':');
    
    const [clientId, clientSecret] = credentials;
    
    const isValid = await verifyClientCredentials(clientId, clientSecret, clients);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid client credentials' });
    }

    const token = generateToken(clientId);
    res.json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: 3600
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router, clients }; 