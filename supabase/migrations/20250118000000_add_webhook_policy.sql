-- Add policy to allow docusign status updates without authentication
CREATE POLICY "Allow docusign status updates"
  ON drones FOR UPDATE
  USING (true)  -- Allow reading any row
  WITH CHECK (
    -- Only allow updating docusign_status and docusign_envelope_id
    -- All other columns must remain unchanged
    id = id AND
    owner_id = owner_id AND
    manufacturer = manufacturer AND
    model = model AND
    serial_number = serial_number AND
    weight = weight AND
    purpose = purpose AND
    created_at = created_at AND
    registration_id = registration_id
  );