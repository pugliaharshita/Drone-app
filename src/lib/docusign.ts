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
      },
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

  private createDocumentHtml(data: DroneSigningData) {
    // Use the existing registration ID directly if provided
    const registrationId = data.registrationId || '${registrationId}';
    const currentDate = new Date().toLocaleDateString();
    
    return `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb;">Official Drone Registration Certificate</h1>
            <p style="font-size: 14px; color: #666;">This document serves as the official registration for your unmanned aircraft system (UAS)</p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <h2 style="color: #1e40af; margin-bottom: 15px;">Registration Information</h2>
            <p><strong>Registration ID:</strong> ${registrationId}</p>
            <p><strong>Issue Date:</strong> ${currentDate}</p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <h2 style="color: #1e40af; margin-bottom: 15px;">Drone Specifications</h2>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Manufacturer:</strong> ${data.manufacturer}</li>
              <li><strong>Model:</strong> ${data.model}</li>
              <li><strong>Serial Number:</strong> ${data.serialNumber}</li>
            </ul>
          </div>

          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <h2 style="color: #1e40af; margin-bottom: 15px;">Owner Information</h2>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Full Name:</strong> ${data.ownerName}</li>
              <li><strong>Email:</strong> ${data.ownerEmail}</li>
              <li><strong>Pilot License:</strong> ${data.pilotLicense}</li>
            </ul>
          </div>

          <div style="margin-bottom: 30px;">
            <h2 style="color: #1e40af; margin-bottom: 15px;">Terms and Conditions</h2>
            <div style="font-size: 14px;">
              <p><strong>1. Registration Requirements</strong></p>
              <ul>
                <li>This registration is valid for 3 years from the date of issue</li>
                <li>The registration ID must be displayed on the exterior of the drone</li>
                <li>Registration must be renewed before expiration to maintain compliance</li>
              </ul>

              <p><strong>2. Operating Requirements</strong></p>
              <ul>
                <li>Fly only in authorized airspace and maintain visual line of sight</li>
                <li>Do not fly over people or moving vehicles</li>
                <li>Maximum altitude of 400 feet above ground level</li>
                <li>Fly only during daylight hours or civil twilight</li>
                <li>Minimum weather visibility of 3 miles from control station</li>
              </ul>

              <p><strong>3. Safety Requirements</strong></p>
              <ul>
                <li>Conduct pre-flight inspection before each flight</li>
                <li>Maintain safe distance from airports and heliports</li>
                <li>Do not operate under the influence of drugs or alcohol</li>
                <li>Report any accidents causing injury or property damage</li>
              </ul>

              <p><strong>4. Privacy and Data Protection</strong></p>
              <ul>
                <li>Respect privacy rights and property boundaries</li>
                <li>Obtain necessary permissions for operations over private property</li>
                <li>Comply with all applicable privacy and data protection laws</li>
              </ul>
            </div>
          </div>

          <div style="margin-bottom: 30px;">
            <h2 style="color: #1e40af; margin-bottom: 15px;">Owner Declaration</h2>
            <p style="font-size: 14px;">By signing this document, I declare that:</p>
            <ul style="font-size: 14px;">
              <li>All information provided is true and accurate</li>
              <li>I understand and agree to comply with all drone operation regulations</li>
              <li>I will maintain current registration and promptly update any changes</li>
              <li>I acknowledge responsibility for safe and legal drone operation</li>
              <li>I understand that violations may result in penalties or registration revocation</li>
            </ul>
          </div>

          <div style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
            <p style="margin-bottom: 30px;">Owner Signature:</p>
            \${signHere}
            
            <p style="margin-top: 20px;">Date: \${date}</p>
          </div>

          <div style="margin-top: 40px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px;">
            <p><strong>Important Notice:</strong> This is an official registration document issued under applicable aviation regulations. 
            Falsification of information or violation of terms may result in civil and/or criminal penalties. 
            Keep this document in your records and maintain a copy with your drone during operation.</p>
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