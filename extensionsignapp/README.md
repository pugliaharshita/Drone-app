# Extension Sign App

A serverless application for mobile number verification using OAuth 2.0 authentication.

## Required Environment Variables

Set these environment variables in your Netlify dashboard:

```
DEFAULT_CLIENT_ID=your-client-id
DEFAULT_CLIENT_SECRET=your-client-secret
JWT_SECRET=your-jwt-secret
```

Make sure to use secure, random values for production.

## Deployment Instructions

1. Go to [Netlify](https://app.netlify.com)
2. Click "Add new site" > "Import an existing project"
3. Choose "Deploy with GitHub"
4. Select your repository
5. Configure build settings:
   - Base directory: `extensionsignapp`
   - Build command: `npm run build`
   - Publish directory: `build`
6. Add environment variables:
   - Go to Site settings > Build & deploy > Environment variables
   - Add the following:
     - `DEFAULT_CLIENT_ID`: Your chosen client ID
     - `DEFAULT_CLIENT_SECRET`: Your chosen client secret
     - `JWT_SECRET`: Your secret key for JWT tokens
7. Click "Deploy site"

## API Endpoints

All endpoints are available at `/.netlify/functions/oauth/[endpoint]`

### 1. Get Access Token
```http
POST /.netlify/functions/oauth/token
Authorization: Basic base64(DEFAULT_CLIENT_ID:DEFAULT_CLIENT_SECRET)
```

Response:
```json
{
  "access_token": "your_jwt_token",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### 2. Verify Mobile Number
```http
POST /.netlify/functions/oauth/verify-mobile
Authorization: Bearer your_access_token
Content-Type: application/json

{
  "mobileNumber": "1234567890",
  "excelFile": "base64_encoded_excel_file"
}
```

Response:
```json
{
  "verified": true|false,
  "message": "Mobile number verified successfully" | "Mobile number not found in records"
}
```

## Development

To run locally:
1. Create a `.env` file in the extensionsignapp directory:
```env
DEFAULT_CLIENT_ID=your-development-client-id
DEFAULT_CLIENT_SECRET=your-development-client-secret
JWT_SECRET=your-development-jwt-secret
```

2. Start the development server:
```bash
npm install
netlify dev
```

This will start both the React frontend and the Netlify functions. 