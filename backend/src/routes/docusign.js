const express = require('express');
const router = express.Router();
const docuSignService = require('../services/docusign');
const { createClient } = require('@supabase/supabase-js');

// Create a Supabase client with the service role key for admin access
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Create envelope and get signing URL
router.post('/create-envelope', async (req, res) => {
  try {
    const {
      templateId,
      signerEmail,
      signerName,
      roleName,
      registrationId,
      templateData
    } = req.body;

    if (!templateId || !signerEmail || !signerName || !roleName || !templateData) {
      throw new Error('Missing required template data');
    }

    const result = await docuSignService.createEnvelopeFromTemplate({
      templateId,
      signerEmail,
      signerName,
      roleName,
      registrationId,
      templateData
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error creating envelope:', error);
    res.status(500).json({ message: error.message || 'Failed to create envelope' });
  }
});

// Get signing URL for an envelope
router.post('/signing-url', async (req, res) => {
  try {
    const { envelopeId, returnUrl, signerEmail, signerName } = req.body;
    
    console.log('Received signing URL request:', {
      envelopeId,
      returnUrl,
      signerEmail,
      signerName
    });

    const url = await docuSignService.createRecipientView(
      envelopeId,
      returnUrl,
      signerEmail,
      signerName
    );
    res.json({ url });
  } catch (error) {
    console.error('Error getting signing URL:', error);
    res.status(500).json({ message: error.message || 'Failed to get signing URL' });
  }
});

// DocuSign Connect webhook endpoint
router.post('/webhook', async (req, res) => {
  try {
    console.log('Received DocuSign webhook payload:', JSON.stringify(req.body, null, 2));

    // Extract envelope data from the webhook payload
    const envelopeId = req.body.data?.envelopeId;
    const event = req.body.event;
    
    console.log('Extracted webhook data:', { envelopeId, event });
    
    if (!envelopeId) {
      console.error('Webhook payload missing envelope ID. Full payload:', JSON.stringify(req.body, null, 2));
      return res.status(200).json({ message: 'No envelope ID in webhook payload' });
    }

    // Map DocuSign events to our status values
    let status;
    switch (event) {
      case 'envelope-completed':
        status = 'completed';
        break;
      case 'envelope-declined':
        status = 'declined';
        break;
      case 'envelope-voided':
        status = 'voided';
        break;
      default:
        status = event;
    }

    console.log('Mapped status:', { event, status });

    // First find the drone record using admin client
    console.log('Searching for drone with envelope ID:', envelopeId);
    const { data: drone, error: findError } = await supabaseAdmin
      .from('drones')
      .select('*')
      .eq('docusign_envelope_id', envelopeId)
      .single();

    if (findError) {
      console.error('Error finding drone:', findError);
      console.error('Supabase find error details:', {
        message: findError.message,
        details: findError.details,
        hint: findError.hint
      });
      return res.status(200).json({ message: 'Failed to find drone record for envelope' });
    }

    if (!drone) {
      console.error('No drone found for envelope ID:', envelopeId);
      return res.status(200).json({ message: 'No matching drone found for envelope' });
    }

    console.log('Found drone record:', {
      id: drone.id,
      serial_number: drone.serial_number,
      docusign_envelope_id: drone.docusign_envelope_id,
      current_status: drone.docusign_status
    });

    // Update the status using admin client
    console.log('Attempting to update drone status:', {
      droneId: drone.id,
      serialNumber: drone.serial_number,
      oldStatus: drone.docusign_status,
      newStatus: status
    });

    // Perform the update using admin client
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('drones')
      .update({ docusign_status: status })
      .eq('id', drone.id)
      .select();

    if (updateError) {
      console.error('Error updating drone:', updateError);
      console.error('Supabase update error details:', {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint
      });
      return res.status(200).json({ message: 'Failed to update drone status' });
    }

    if (!updateData || updateData.length === 0) {
      console.error('No rows were updated. Current drone state:', drone);
      return res.status(200).json({ 
        message: 'No rows were updated',
        currentState: {
          id: drone.id,
          status: drone.docusign_status
        }
      });
    }

    const updatedDrone = updateData[0];
    console.log('Successfully updated drone status. Updated record:', updatedDrone);
    console.log('Status update summary:', { 
      droneId: drone.id, 
      serialNumber: drone.serial_number,
      oldStatus: drone.docusign_status,
      newStatus: status,
      envelopeId,
      event,
      actualNewStatus: updatedDrone.docusign_status
    });

    res.status(200).json({ 
      message: 'Webhook processed successfully',
      droneId: drone.id,
      serialNumber: drone.serial_number,
      oldStatus: drone.docusign_status,
      newStatus: updatedDrone.docusign_status,
      envelopeId,
      event
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    console.error('Error stack:', error.stack);
    // Always return 200 to acknowledge receipt of webhook
    res.status(200).json({ message: 'Error processing webhook', error: error.message });
  }
});

module.exports = router; 