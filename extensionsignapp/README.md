# Extension Sign App

A serverless application for mobile number verification using OAuth 2.0 authentication.

## Deployment Instructions

1. Install Netlify CLI globally:
```bash
npm install -g netlify-cli
```

2. Install dependencies:
```bash
npm install
```

3. Login to Netlify:
```bash
netlify login
```

4. Initialize Netlify site (if not already done):
```bash
netlify init
```

5. Set up environment variables in Netlify:
   - Go to Site settings > Build & deploy > Environment variables
   - Add the following variables:
     - `JWT_SECRET`: Your secret key for JWT tokens

6. Deploy to Netlify:
```bash
netlify deploy --prod
```

## API Endpoints

All endpoints are available at `/.netlify/functions/oauth/[endpoint]`

### 1. Register Client
```http
POST /.netlify/functions/oauth/register
Content-Type: application/json

{
  "name": "Your App Name"
}
```

### 2. Get Access Token
```http
POST /.netlify/functions/oauth/token
Authorization: Basic base64(clientId:clientSecret)
```

### 3. Verify Mobile Number
```http
POST /.netlify/functions/oauth/verify-mobile
Authorization: Bearer your_access_token
Content-Type: application/json

{
  "mobileNumber": "1234567890",
  "excelFile": "base64_encoded_excel_file"
}
```

## Development

To run locally:
```bash
netlify dev
```

This will start both the React frontend and the Netlify functions. 