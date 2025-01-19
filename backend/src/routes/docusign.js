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
    const { envelopeId, status, envelopeStatus } = req.body;
    const actualStatus = status || envelopeStatus;
    
    if (!envelopeId) {
      throw new Error('No envelope ID in webhook payload');
    }

    // Update the drone record in Supabase
    const { data: drone, error: findError } = await supabase
      .from('drones')
      .select('*')
      .eq('docusign_envelope_id', envelopeId)
      .single();

    if (findError) {
      console.error('Error finding drone:', findError);
      throw new Error('Failed to find drone record for envelope');
    }

    if (!drone) {
      console.error('No drone found for envelope ID:', envelopeId);
      // Still return 200 to acknowledge webhook
      return res.status(200).json({ message: 'No matching drone found for envelope' });
    }

    // Map DocuSign status to our status
    let droneStatus = actualStatus;
    if (actualStatus === 'Completed' || actualStatus === 'completed') {
      droneStatus = 'completed';
    } else if (actualStatus === 'Declined' || actualStatus === 'declined') {
      droneStatus = 'declined';
    } else if (actualStatus === 'Voided' || actualStatus === 'voided') {
      droneStatus = 'voided';
    } else if (actualStatus === 'Sent' || actualStatus === 'sent') {
      droneStatus = 'sent';
    } else if (actualStatus === 'Delivered' || actualStatus === 'delivered') {
      droneStatus = 'delivered';
    }

    // Update the status
    const { error: updateError } = await supabase
      .from('drones')
      .update({
        docusign_status: droneStatus
      })
      .eq('id', drone.id);

    if (updateError) {
      console.error('Error updating drone:', updateError);
      throw new Error('Failed to update drone status');
    }

    console.log('Successfully updated drone status:', { droneId: drone.id, status: droneStatus });
    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    // Always return 200 to DocuSign to acknowledge receipt
    res.status(200).json({ message: 'Webhook received with errors', error: error.message });
  }
});

module.exports = router; 