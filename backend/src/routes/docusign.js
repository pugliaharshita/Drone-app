const express = require('express');
const router = express.Router();
const docuSignService = require('../services/docusign');
const supabase = require('../lib/supabase');

// Create envelope and get signing URL
router.post('/create-envelope', async (req, res) => {
  try {
    const data = req.body;
    const result = await docuSignService.createEnvelope(data);
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
    console.log('Received DocuSign webhook:', JSON.stringify(req.body, null, 2));

    // Extract envelope data from the webhook payload
    const envelopeId = req.body.data?.envelopeId;
    const event = req.body.event;
    
    if (!envelopeId) {
      console.error('Webhook payload missing envelope ID:', req.body);
      // Return 200 even for errors to acknowledge receipt
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

    console.log('Processing webhook for envelope:', { envelopeId, event, status });

    // Update the drone record in Supabase
    const { data: drone, error: findError } = await supabase
      .from('drones')
      .select('*')
      .eq('docusign_envelope_id', envelopeId)
      .single();

    if (findError) {
      console.error('Error finding drone:', findError);
      return res.status(200).json({ message: 'Failed to find drone record for envelope' });
    }

    if (!drone) {
      console.error('No drone found for envelope ID:', envelopeId);
      return res.status(200).json({ message: 'No matching drone found for envelope' });
    }

    console.log('Found drone record:', drone);

    // Update the status
    const { error: updateError } = await supabase
      .from('drones')
      .update({
        docusign_status: status
      })
      .eq('id', drone.id);

    if (updateError) {
      console.error('Error updating drone:', updateError);
      return res.status(200).json({ message: 'Failed to update drone status' });
    }

    console.log('Successfully updated drone status:', { 
      droneId: drone.id, 
      oldStatus: drone.docusign_status,
      newStatus: status 
    });

    res.status(200).json({ 
      message: 'Webhook processed successfully',
      droneId: drone.id,
      status: status
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    // Always return 200 to acknowledge receipt of webhook
    res.status(200).json({ message: 'Error processing webhook', error: error.message });
  }
});

module.exports = router; 