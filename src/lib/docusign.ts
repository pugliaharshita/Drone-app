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
    // Validate required data
    if (!data.ownerEmail || !data.ownerName || !data.manufacturer || !data.model || !data.serialNumber || !data.pilotLicense) {
      console.error('Missing required data:', {
        ownerEmail: !!data.ownerEmail,
        ownerName: !!data.ownerName,
        manufacturer: !!data.manufacturer,
        model: !!data.model,
        serialNumber: !!data.serialNumber,
        pilotLicense: !!data.pilotLicense
      });
      throw new Error('Missing required template data: All fields must be provided');
    }

    const templateData = {
      droneId: data.droneId,
      manufacturer: data.manufacturer,
      model: data.model,
      serialNumber: data.serialNumber,
      ownerName: data.ownerName,
      ownerEmail: data.ownerEmail,
      pilotLicense: data.pilotLicense,
      registrationDate: new Date().toLocaleDateString()
    };

    console.log('Creating signing request with data:', {
      templateData,
      signerEmail: data.ownerEmail,
      signerName: data.ownerName
    });

    try {
      const response = await fetch(`${API_BASE_URL}/api/docusign/create-envelope`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: '5981d32d-f138-4cb3-9133-cc562830177b',
          signerEmail: data.ownerEmail,
          signerName: data.ownerName,
          roleName: 'signer',
          registrationId: data.registrationId,
          templateData
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('DocuSign API error:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(errorData.message || `Failed to create signing request: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Signing request created successfully:', result);
      return result;
    } catch (error) {
      console.error('Error in createSigningRequest:', error);
      throw error;
    }
  }

  private async getSigningUrl(envelopeId: string, returnUrl: string) {
    if (!this.currentSignerEmail || !this.currentSignerName) {
      throw new Error('Signer information is missing');
    }

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
          signerName: this.currentSignerName,
          clientUserId: '1001'
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
      
      // Create the envelope using template
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

  async downloadDocument(envelopeId: string): Promise<void> {
    try {
      console.log('Downloading document for envelope:', envelopeId);
      
      const response = await fetch(
        `${API_BASE_URL}/api/docusign/download-document/${envelopeId}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || 'Failed to download document';
        } catch {
          errorMessage = await response.text() || 'Failed to download document';
        }
        console.error('Error downloading document:', errorMessage);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      if (!result.data) {
        throw new Error('No document data received from server');
      }

      // Convert base64 to blob
      const byteCharacters = atob(result.data);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Try to open in new tab first
      const newWindow = window.open(url, '_blank');
      
      // If popup blocked or failed, trigger download
      if (!newWindow) {
        console.log('Opening in new tab failed, triggering download...');
        const link = document.createElement('a');
        link.href = url;
        link.download = `drone_registration_${envelopeId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      // Clean up the URL after a delay
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 2000);
      
      console.log('Document downloaded successfully');
    } catch (error) {
      console.error('Error in downloadDocument:', error);
      throw error;
    }
  }
}

export const docuSignService = new DocuSignService(); 