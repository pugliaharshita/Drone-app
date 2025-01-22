# Drone Registration Application

A web application for managing drone registrations with electronic document signing capabilities using DocuSign integration.

## Features

- Drone registration management
- Electronic document signing via DocuSign
- Automated registration ID generation
- Email notifications for signing requests
- Real-time status tracking of signing process
- Secure document storage and handling
- Template-based document generation
- Automated email reminders for pending signatures
- Status tracking and webhook notifications

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- DocuSign Developer Account
- Supabase Account (for database)

## Environment Variables

Create a `.env` file in both the root and backend directories with the following variables:

```env
# Frontend (.env)
VITE_API_BASE_URL=your_backend_url
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Backend (.env)
DOCUSIGN_ACCOUNT_ID=your_docusign_account_id
DOCUSIGN_INTEGRATION_KEY=your_docusign_integration_key
DOCUSIGN_USER_ID=your_docusign_user_id
DOCUSIGN_BASE_PATH=https://demo.docusign.net/restapi
DOCUSIGN_WEBHOOK_URL=your_webhook_url
DOCUSIGN_PRIVATE_KEY=your_docusign_private_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd drone-app
```

2. Install dependencies for both frontend and backend:
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
```

## Running the Application

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. Start the frontend development server:
```bash
# In a new terminal
npm run dev
```

The application will be available at `http://localhost:5173`

## Usage Guide

### Registration Process

1. **Adding a New Drone**
   - Click the "Register New Drone" button
   - Fill in the required information:
     - Manufacturer
     - Model
     - Serial Number
     - Owner Name
     - Owner Email
     - Pilot License Number
   - Submit the form to initiate registration

2. **Document Signing**
   - After submission, the owner will receive an email from DocuSign
   - Click the link in the email to view and sign the document
   - Review the pre-filled information
   - Sign in the designated location
   - Submit the signed document

3. **Status Tracking**
   - View registration status in the dashboard
   - Status updates automatically via webhooks
   - Possible statuses:
     - Pending: Document sent for signing
     - Completed: Document signed
     - Declined: Signing declined
     - Voided: Registration voided

### Managing Registrations

1. **Dashboard Features**
   - View all registrations
   - Filter by status
   - Search by registration ID or owner details
   - Sort by date, status, or owner

2. **Actions Available**
   - View registration details
   - Download signed documents
   - Resend signing requests
   - Void registrations
   - Update registration status

### Email Notifications

The system sends emails for:
- Initial signing request
- Reminder after 2 days if not signed
- Final reminder 3 days before expiration
- Confirmation after successful signing
- Status updates

## DocuSign Configuration

1. Create a DocuSign Developer Account
2. Create an Integration Key in DocuSign Admin
3. Generate an RSA keypair and add the public key to DocuSign
4. Configure the webhook URL in DocuSign Connect
5. Create a template in DocuSign with the following tabs:
   - registration_id (Text)
   - registration_date (Text)
   - manufacturer (Text)
   - model (Text)
   - serial_number (Text)
   - owner_name (Text)
   - owner_email (Text)
   - pilot_license (Text)
   - signature (SignHere)

### Template Configuration

1. **Creating the Template**
   - Log into DocuSign Admin
   - Go to Templates
   - Create New Template
   - Add required fields as Text tabs
   - Add signature field
   - Save template
   - Note the Template ID for configuration

2. **Field Properties**
   - All text fields should be marked as read-only
   - Signature field must be required
   - Set appropriate font and sizing
   - Position fields according to document layout

## API Endpoints

### DocuSign Routes

- `POST /api/docusign/create-envelope`: Create a new signing envelope
  ```json
  {
    "templateId": "string",
    "signerEmail": "string",
    "signerName": "string",
    "roleName": "string",
    "templateData": {
      "manufacturer": "string",
      "model": "string",
      "serialNumber": "string",
      "ownerName": "string",
      "ownerEmail": "string",
      "pilotLicense": "string"
    }
  }
  ```
- `POST /api/docusign/signing-url`: Get signing URL for an envelope
  ```json
  {
    "envelopeId": "string",
    "returnUrl": "string",
    "signerEmail": "string",
    "signerName": "string"
  }
  ```
- `POST /api/docusign/webhook`: Webhook endpoint for DocuSign events

## Database Schema

The application uses Supabase with the following main table:

### Drones Table
```sql
CREATE TABLE drones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  serial_number TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  model TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  pilot_license TEXT NOT NULL,
  registration_id TEXT UNIQUE,
  docusign_envelope_id TEXT,
  docusign_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);
```

## Troubleshooting

### Common Issues

1. **Emails Not Received**
   - Check spam folder
   - Verify email address is correct
   - Ensure DocuSign account is properly configured
   - Check DocuSign sending limits

2. **Signing URL Errors**
   - Verify envelope ID exists
   - Check if envelope is still valid
   - Ensure signer email matches original request

3. **Webhook Issues**
   - Verify webhook URL is accessible
   - Check webhook logs in DocuSign Connect
   - Ensure proper event configuration

### Error Messages

- `Bad Request`: Check request payload format
- `Unauthorized`: Verify API credentials
- `Not Found`: Confirm envelope/template IDs
- `Internal Server Error`: Check server logs

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support:
- Open an issue in the GitHub repository
- Contact the development team
- Check the troubleshooting guide
- Review DocuSign documentation