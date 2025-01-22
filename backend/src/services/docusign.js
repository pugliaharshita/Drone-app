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
      
      // Create the document with registration ID
      const doc = new docusign.Document();
      const documentHtml = data.documentHtml.includes('${registrationId}') 
        ? data.documentHtml.replace('${registrationId}', registrationId)
        : data.documentHtml;
      doc.documentBase64 = Buffer.from(documentHtml).toString('base64');
      doc.name = 'Drone Registration Certificate';
      doc.fileExtension = 'html';
      doc.documentId = '1';

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
        emailNotification: {
          emailSubject: 'Please sign your drone registration certificate',
          emailBody: `Please sign your drone registration certificate. Your registration ID is: ${registrationId}`,
          supportedLanguage: 'en'
        }
      });

      // Create signature and date tabs
      const signHere = docusign.SignHere.constructFromObject({
        anchorString: '${signHere}',
        anchorXOffset: '0',
        anchorYOffset: '0',
        anchorUnits: 'pixels',
        recipientId: '1',
        tabLabel: 'SignHereTab'
      });

      const dateTab = docusign.DateSigned.constructFromObject({
        anchorString: '${date}',
        anchorXOffset: '0',
        anchorYOffset: '0',
        anchorUnits: 'pixels',
        recipientId: '1',
        tabLabel: 'DateSignedTab'
      });

      // Add the tabs to the signer
      signer.tabs = docusign.Tabs.constructFromObject({
        signHereTabs: [signHere],
        dateSignedTabs: [dateTab]
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

      // Create the envelope definition
      const envelopeDefinition = docusign.EnvelopeDefinition.constructFromObject({
        emailSubject: 'Drone Registration Certificate - Signature Required',
        emailBlurb: 'Please review and sign your drone registration certificate.',
        documents: [doc],
        recipients: docusign.Recipients.constructFromObject({
          signers: [signer]
        }),
        eventNotification: eventNotification,
        status: 'sent'  // Send immediately
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

  async createEnvelopeFromTemplate({
    templateId,
    signerEmail,
    signerName,
    roleName = 'signer',
    registrationId,
    templateData
  }) {
    try {
      console.log('Creating envelope from template with data:', {
        templateId,
        signerEmail,
        signerName,
        roleName,
        registrationId,
        templateData
      });

      const accessToken = await this.getAccessToken();
      this.apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
      
      const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
      const finalRegistrationId = registrationId || this.generateRegistrationId();

      console.log('Creating envelope from template for:', { signerEmail, signerName, roleName, finalRegistrationId });

      // Configure the template role with locked values
      const templateRole = docusign.TemplateRole.constructFromObject({
        email: signerEmail,
        name: signerName,
        roleName: roleName,
        clientUserId: '1001',
        recipientId: '1',
        routingOrder: '1',
        emailNotification: {
          emailSubject: 'Please sign your drone registration document',
          emailBody: 'Please review and sign the drone registration document. This is required to complete your registration process.',
          supportedLanguage: 'en'
        },
        tabs: {
          textTabs: [
            {
              tabLabel: 'registration_id',
              value: finalRegistrationId,
              locked: 'true'
            },
            {
              tabLabel: 'registration_date',
              value: templateData.registrationDate,
              locked: 'true'
            },
            {
              tabLabel: 'manufacturer',
              value: templateData.manufacturer,
              locked: 'true'
            },
            {
              tabLabel: 'model',
              value: templateData.model,
              locked: 'true'
            },
            {
              tabLabel: 'serial_number',
              value: templateData.serialNumber,
              locked: 'true'
            },
            {
              tabLabel: 'owner_name',
              value: templateData.ownerName,
              locked: 'true'
            },
            {
              tabLabel: 'owner_email',
              value: templateData.ownerEmail,
              locked: 'true'
            },
            {
              tabLabel: 'pilot_license',
              value: templateData.pilotLicense,
              locked: 'true'
            }
          ]
        }
      });

      // Configure notifications for the envelope
      const notification = new docusign.EventNotification();
      notification.setUrl(process.env.DOCUSIGN_WEBHOOK_URL);
      notification.setLoggingEnabled('true');
      notification.setRequireAcknowledgment('true');
      notification.setUseSoapInterface('false');
      notification.setIncludeCertificateWithSoap('false');
      notification.setSignMessageWithX509Cert('false');
      notification.setIncludeDocuments('false');
      notification.setIncludeEnvelopeVoidReason('true');
      notification.setIncludeTimeZone('true');
      notification.setIncludeSenderAccountAsCustomField('true');
      notification.setIncludeDocumentFields('true');
      notification.setIncludeCertificateOfCompletion('true');

      // Set up the envelope level email settings
      const emailSettings = new docusign.EmailSettings();
      emailSettings.replyEmailAddressOverride = process.env.DOCUSIGN_REPLY_TO || '';
      emailSettings.replyEmailNameOverride = 'Drone Registration System';
      emailSettings.bccEmailAddresses = [];

      // Configure which envelope events trigger notifications
      notification.setEnvelopeEvents([
        { envelopeEventStatusCode: 'sent' },
        { envelopeEventStatusCode: 'delivered' },
        { envelopeEventStatusCode: 'completed' },
        { envelopeEventStatusCode: 'declined' },
        { envelopeEventStatusCode: 'voided' }
      ]);

      // Configure which recipient events trigger notifications
      notification.setRecipientEvents([
        { recipientEventStatusCode: 'Sent' },
        { recipientEventStatusCode: 'Delivered' },
        { recipientEventStatusCode: 'Completed' },
        { recipientEventStatusCode: 'Declined' },
        { recipientEventStatusCode: 'AuthenticationFailed' },
        { recipientEventStatusCode: 'AutoResponded' }
      ]);

      // Create the envelope definition
      const envelopeDefinition = new docusign.EnvelopeDefinition();
      envelopeDefinition.setEmailSubject('Drone Registration Document for Signature');
      envelopeDefinition.setEmailBlurb('Please review and sign this drone registration document. This is required to complete your registration process.');
      envelopeDefinition.setTemplateId(templateId);
      envelopeDefinition.setTemplateRoles([templateRole]);
      envelopeDefinition.setStatus('sent');
      envelopeDefinition.setEventNotification(notification);
      envelopeDefinition.setEmailSettings(emailSettings);

      console.log('Sending envelope definition:', JSON.stringify(envelopeDefinition, null, 2));

      // Create the envelope
      const results = await envelopesApi.createEnvelope(this.accountId, {
        envelopeDefinition
      });

      console.log('Create envelope results:', results);

      return {
        envelopeId: results.envelopeId,
        status: results.status,
        message: 'Envelope created successfully',
        registrationId: finalRegistrationId
      };
    } catch (error) {
      console.error('Error in createEnvelopeFromTemplate:', error);
      throw error;
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