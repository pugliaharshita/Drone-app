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
    const response = await fetch(`${API_BASE_URL}/api/docusign/create-envelope`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'include',
      mode: 'cors',
      body: JSON.stringify(data)
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
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
        mode: 'cors',
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

  private createDocumentHtml(data: DroneSigningData) {
    // Use the existing registration ID directly if provided
    const registrationId = data.registrationId || '${registrationId}';
    
    return `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h1>Drone Registration Certificate</h1>
          <p>This document certifies that the following drone has been officially registered:</p>
          
          <h2>Registration Details</h2>
          <p><strong>Registration ID:</strong> ${registrationId}</p>
          
          <h2>Drone Information</h2>
          <ul>
            <li>Manufacturer: ${data.manufacturer}</li>
            <li>Model: ${data.model}</li>
            <li>Serial Number: ${data.serialNumber}</li>
          </ul>

          <h2>Owner Information</h2>
          <ul>
            <li>Name: ${data.ownerName}</li>
            <li>Email: ${data.ownerEmail}</li>
            <li>Pilot License: ${data.pilotLicense}</li>
          </ul>

          <div style="margin-top: 50px;">
            <p>Owner Signature: <span style="color: #AAA;">Sign Here</span></p>
            \${signHere}
            
            <p>Date: \${date}</p>
          </div>

          <div style="margin-top: 30px; border-top: 1px solid #ccc; padding-top: 20px;">
            <p style="font-size: 12px; color: #666;">
              This is an official registration document. The signature confirms that all provided information is accurate.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  async initiateSigningProcess(data: DroneSigningData, returnUrl: string): Promise<SigningResponse> {
    try {
      console.log('Initiating signing process with data:', data);
      
      // Store signer info for URL generation
      this.currentSignerEmail = data.ownerEmail;
      this.currentSignerName = data.ownerName;
      
      // Create the envelope and send for signing
      const response = await this.createSigningRequest({
        ...data,
        documentHtml: this.createDocumentHtml(data)
      });
      
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