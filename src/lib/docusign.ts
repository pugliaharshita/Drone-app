// DocuSign configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

interface DroneSigningData {
  droneId: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  ownerName: string;
  ownerEmail: string;
  pilotLicense: string;
  documentHtml?: string;
  registrationId?: string;
}

interface SigningResponse {
  envelopeId: string;
  status: string;
  message: string;
  registrationId: string;
}

class DocuSignService {
  private currentSignerEmail: string = '';
  private currentSignerName: string = '';

  private async createSigningRequest(data: DroneSigningData): Promise<SigningResponse> {
    console.log('Raw data received:', data);

    // Ensure we have required data
    if (!data.ownerEmail || !data.ownerName) {
      throw new Error('Missing required signer information');
    }

    // Format the data for the template
    const formattedData = {
      templateId: '5981d32d-f138-4cb3-9133-cc562830177b',
      signer: {
        email: data.ownerEmail,
        name: data.ownerName,
        recipientId: '1',
        routingOrder: '1'
      },
      registrationId: data.registrationId,
      manufacturer: data.manufacturer,
      model: data.model,
      serialNumber: data.serialNumber,
      pilotLicense: data.pilotLicense
    };

    console.log('Sending formatted data to create envelope:', formattedData);

    const response = await fetch(`${API_BASE_URL}/api/docusign/create-envelope`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formattedData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('DocuSign error details:', errorData);
      throw new Error(errorData.message || `Failed to create signing request: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  }

  private async getSigningUrl(envelopeId: string, returnUrl: string) {
    const response = await fetch(
      `${API_BASE_URL}/api/docusign/signing-url`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          envelopeId,
          returnUrl,
          signerEmail: this.currentSignerEmail,
          signerName: this.currentSignerName
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('DocuSign error details:', errorData);
      throw new Error(errorData.message || `Failed to get signing URL: ${response.statusText}`);
    }

    const result = await response.json();
    return result.url;
  }

  async initiateSigningProcess(data: DroneSigningData, returnUrl: string): Promise<SigningResponse> {
    try {
      console.log('Initiating signing process with data:', data);
      
      // Store signer info for URL generation
      this.currentSignerEmail = data.ownerEmail;
      this.currentSignerName = data.ownerName;
      
      // Create the envelope using template and send for signing
      const response = await this.createSigningRequest(data);
      
      console.log('Envelope created:', { 
        envelopeId: response.envelopeId, 
        status: response.status, 
        message: response.message, 
        registrationId: response.registrationId 
      });

      if (!response.registrationId) {
        throw new Error('No registration ID received from DocuSign service');
      }

      return {
        envelopeId: response.envelopeId,
        status: response.status,
        message: response.message,
        registrationId: response.registrationId
      };
    } catch (error) {
      console.error('Detailed error in signing process:', error);
      throw error;
    }
  }
}

export const docuSignService = new DocuSignService(); 