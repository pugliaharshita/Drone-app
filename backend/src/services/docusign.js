const docusign = require('docusign-esign');
const fs = require('fs');
const path = require('path');

class DocuSignService {
  constructor() {
    this.apiClient = new docusign.ApiClient();
    this.apiClient.setBasePath(process.env.DOCUSIGN_BASE_PATH);
    this.accountId = process.env.DOCUSIGN_ACCOUNT_ID;
    this.accessToken = null;
    this.tokenExpiresAt = 0;

    // Initialize with proper RSA key
    const privateKey = process.env.DOCUSIGN_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('DocuSign private key is not configured');
    }

    try {
      // Clean up the private key string
      this.privateKey = privateKey
        .replace(/\\n/g, '\n')
        .replace(/["']/g, '')
        .replace(/^\s+|\s+$/g, '')  // Remove any leading/trailing whitespace
        .trim();

      // Ensure proper PEM format
      if (!this.privateKey.startsWith('-----BEGIN RSA PRIVATE KEY-----\n')) {
        this.privateKey = '-----BEGIN RSA PRIVATE KEY-----\n' + this.privateKey;
      }
      if (!this.privateKey.endsWith('\n-----END RSA PRIVATE KEY-----')) {
        this.privateKey = this.privateKey + '\n-----END RSA PRIVATE KEY-----';
      }

      // Validate key format
      if (!this.privateKey.includes('-----BEGIN RSA PRIVATE KEY-----')) {
        throw new Error('Invalid private key format. Must be an RSA private key.');
      }

      console.log('Private key format validation passed');
    } catch (error) {
      console.error('Error initializing private key:', error);
      throw new Error('Failed to initialize DocuSign service: Invalid private key');
    }
  }

  async getAccessToken() {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    try {
      const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
      const userId = process.env.DOCUSIGN_USER_ID;

      if (!integrationKey || !userId) {
        throw new Error('Missing required DocuSign configuration');
      }

      console.log('Requesting JWT token with:');
      console.log('Integration Key:', integrationKey);
      console.log('User ID:', userId);
      console.log('Base Path:', process.env.DOCUSIGN_BASE_PATH);

      // Set OAuth BasePath for JWT authentication
      this.apiClient.setOAuthBasePath('account-d.docusign.com');

      // Define scopes
      const scopes = [
        'signature',
        'impersonation'
      ];

      try {
        console.log('Requesting JWT token...');
        const response = await this.apiClient.requestJWTUserToken(
          integrationKey,
          userId,
          scopes,
          this.privateKey,
          3600
        );

        this.accessToken = response.body.access_token;
        this.tokenExpiresAt = Date.now() + ((response.body.expires_in - 60) * 1000);
        
        return this.accessToken;
      } catch (error) {
        // Check if this is a consent_required error
        if (error.response && error.response.body && error.response.body.error === 'consent_required') {
          // Build the consent URL according to DocuSign specifications
          const SERVER = 'https://account-d.docusign.com';  // Using demo environment
          const CLIENT_ID = integrationKey;
          const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
          const REDIRECT_URI = encodeURIComponent(`${FRONTEND_URL}/docusign-callback`);
          const SCOPES = encodeURIComponent('signature impersonation');
          
          const consentUrl = `${SERVER}/oauth/auth?response_type=code&scope=${SCOPES}&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}`;
          
          console.log('\n=== DocuSign Consent Required ===');
          console.log('Please visit this URL to grant consent:');
          console.log(consentUrl);
          console.log('\nAfter granting consent:');
          console.log('1. You will be redirected back to your application');
          console.log('2. The application will process the consent and continue');
          console.log('=====================================\n');
          
          throw new Error(`DocuSign consent required. Please visit: ${consentUrl}`);
        }
        throw error;
      }
    } catch (error) {
      console.error('Detailed error getting access token:', error);
      if (error.response && error.response.body) {
        console.error('Error response body:', error.response.body);
      }
      throw error;
    }
  }

  async createEnvelope(data) {
    try {
      const accessToken = await this.getAccessToken();
      this.apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
      
      const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
      
      // Use existing registration ID if provided, otherwise generate a new one
      const registrationId = data.registrationId || this.generateRegistrationId();
      
      // Store owner info for consistent use
      const ownerEmail = data.ownerEmail;
      const ownerName = data.ownerName;

      console.log('Creating envelope for owner:', { ownerEmail, ownerName, registrationId });

      // Create the signer recipient with owner info
      const signer = docusign.Signer.constructFromObject({
        email: ownerEmail,
        name: ownerName,
        recipientId: '1',
        routingOrder: '1',
        roleName: 'signer', // Keep role name for template mapping
        emailNotification: {
          emailSubject: 'Please sign your drone registration certificate',
          emailBody: `Please sign your drone registration certificate. Your registration ID is: ${registrationId}`,
          supportedLanguage: 'en'
        },
        tabs: {
          textTabs: [
            {
              tabLabel: 'registrationId',
              value: registrationId
            },
            {
              tabLabel: 'manufacturer',
              value: data.manufacturer
            },
            {
              tabLabel: 'model',
              value: data.model
            },
            {
              tabLabel: 'serialNumber',
              value: data.serialNumber
            },
            {
              tabLabel: 'pilotLicense',
              value: data.pilotLicense
            }
          ]
        }
      });

      // Configure webhook notification
      const eventNotification = docusign.EventNotification.constructFromObject({
        url: process.env.WEBHOOK_URL || `${process.env.BACKEND_URL}/api/docusign/webhook`,
        loggingEnabled: true,
        requireAcknowledgment: true,
        useSoapInterface: false,
        includeCertificateWithSoap: false,
        signMessageWithX509Cert: false,
        includeDocuments: false,
        includeEnvelopeVoidReason: true,
        includeTimeZone: true,
        includeSenderAccountAsCustomField: true,
        includeDocumentFields: false,
        includeCertificateOfCompletion: true,
        envelopeEvents: [
          { envelopeEventStatusCode: 'completed' },
          { envelopeEventStatusCode: 'declined' },
          { envelopeEventStatusCode: 'voided' }
        ],
        recipientEvents: [
          { recipientEventStatusCode: 'Completed' },
          { recipientEventStatusCode: 'Declined' },
          { recipientEventStatusCode: 'AuthenticationFailed' }
        ]
      });

      // Create the envelope definition using the template
      const envelopeDefinition = docusign.EnvelopeDefinition.constructFromObject({
        templateId: data.templateId,
        status: 'sent',  // Send immediately
        emailSubject: 'Drone Registration Certificate - Signature Required',
        emailBlurb: `Please review and sign your drone registration certificate. Your registration ID is: ${registrationId}`,
        notification: {
          useAccountDefaults: false,
          reminders: {
            reminderEnabled: true,
            reminderDelay: 2,
            reminderFrequency: 2
          },
          expirations: {
            expireEnabled: true,
            expireAfter: 30,
            expireWarn: 5
          }
        },
        recipients: {
          signers: [signer]
        }
      });

      console.log('Creating envelope with definition:', JSON.stringify(envelopeDefinition, null, 2));

      // Create the envelope
      const results = await envelopesApi.createEnvelope(this.accountId, {
        envelopeDefinition
      });

      console.log('Envelope created successfully:', results);
      return {
        envelopeId: results.envelopeId,
        status: results.status,
        message: `An email has been sent to ${ownerEmail} for signing.`,
        registrationId // Return the registration ID used in the document
      };
    } catch (error) {
      console.error('Error creating envelope:', error);
      throw new Error(error.message || 'Failed to create envelope');
    }
  }

  // Helper method to generate a unique registration ID
  generateRegistrationId() {
    const prefix = 'DR';
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  async createRecipientView(envelopeId, returnUrl, signerEmail, signerName) {
    try {
      const accessToken = await this.getAccessToken();
      this.apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
      
      const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
      
      console.log('Creating recipient view with:', {
        envelopeId,
        returnUrl,
        signerEmail,
        signerName
      });

      // Create recipient view request with owner info
      const recipientViewRequest = docusign.RecipientViewRequest.constructFromObject({
        authenticationMethod: 'email',
        clientUserId: '1001',
        recipientId: '1',
        returnUrl,
        userName: signerName,
        email: signerEmail,
        pingFrequency: '600',
        pingUrl: returnUrl
      });

      console.log('Requesting recipient view with:', JSON.stringify(recipientViewRequest, null, 2));
      const results = await envelopesApi.createRecipientView(this.accountId, envelopeId, {
        recipientViewRequest
      });

      console.log('Recipient view created successfully');
      return results.url;
    } catch (error) {
      console.error('Detailed error creating recipient view:', error);
      if (error.response && error.response.body) {
        console.error('Error response body:', error.response.body);
      }
      throw new Error(error.message || 'Failed to create signing URL');
    }
  }
}

module.exports = new DocuSignService(); 