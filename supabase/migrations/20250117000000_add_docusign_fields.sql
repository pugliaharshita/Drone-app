-- Add DocuSign fields to drones table
ALTER TABLE drones
ADD COLUMN IF NOT EXISTS docusign_envelope_id text,
ADD COLUMN IF NOT EXISTS docusign_status text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_drones_docusign_envelope_id ON drones(docusign_envelope_id);

COMMENT ON COLUMN drones.docusign_envelope_id IS 'DocuSign envelope ID for the signed registration certificate';
COMMENT ON COLUMN drones.docusign_status IS 'Status of the DocuSign signing process (sent, completed, etc.)'; 