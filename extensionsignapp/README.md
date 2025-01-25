# Extension Sign App

A serverless application for mobile number verification using OAuth 2.0 authentication.

## OAuth 2.0 Endpoints

### Authorization URL
```
https://droneextensionapp.netlify.app/.netlify/functions/oauth/authorize
```

Required parameters:
- `client_id`: Your client ID
- `redirect_uri`: Your application's callback URL
- `response_type`: Must be "code"
- `state`: (Optional) Random string to prevent CSRF attacks

Example:
```
https://droneextensionapp.netlify.app/.netlify/functions/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_CALLBACK_URL&response_type=code
```

### Token URL
```
https://droneextensionapp.netlify.app/.netlify/functions/oauth/token
```

Supports two grant types:

1. Authorization Code Grant:
```http
POST https://droneextensionapp.netlify.app/.netlify/functions/oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "AUTHORIZATION_CODE",
  "redirect_uri": "YOUR_CALLBACK_URL"
}
```

2. Client Credentials Grant:
```http
POST https://droneextensionapp.netlify.app/.netlify/functions/oauth/token
Authorization: Basic base64(DEFAULT_CLIENT_ID:DEFAULT_CLIENT_SECRET)
Content-Type: application/json

{
  "grant_type": "client_credentials"
}
```

Response:
```json
{
  "access_token": "your_jwt_token",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

## Required Environment Variables

Set these environment variables in your Netlify dashboard:

```
DEFAULT_CLIENT_ID=your-client-id
DEFAULT_CLIENT_SECRET=your-client-secret
JWT_SECRET=your-jwt-secret
```

Make sure to use secure, random values for production.

## API Endpoints

### Verify Mobile Number
```http
POST https://droneextensionapp.netlify.app/.netlify/functions/oauth/verify-mobile
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

## Quick Start

1. Get an access token using client credentials:
```bash
curl -X POST https://droneextensionapp.netlify.app/.netlify/functions/oauth/token \
  -H "Authorization: Basic $(echo -n 'YOUR_CLIENT_ID:YOUR_CLIENT_SECRET' | base64)" \
  -H "Content-Type: application/json" \
  -d '{"grant_type": "client_credentials"}'
```

2. Use the token to verify mobile numbers:
```bash
curl -X POST https://droneextensionapp.netlify.app/.netlify/functions/oauth/verify-mobile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mobileNumber": "1234567890",
    "excelFile": "BASE64_ENCODED_EXCEL_FILE"
  }'
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