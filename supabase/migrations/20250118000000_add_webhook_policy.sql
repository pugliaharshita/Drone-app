-- Add policy to allow docusign status updates without authentication
CREATE POLICY "Allow docusign status updates"
  ON drones FOR UPDATE
  USING (true)  -- Allow reading any row
  WITH CHECK (
    -- Only allow updating docusign_status and docusign_envelope_id
    (COALESCE(OLD.id = NEW.id, true)) AND
    (COALESCE(OLD.owner_id = NEW.owner_id, true)) AND
    (COALESCE(OLD.manufacturer = NEW.manufacturer, true)) AND
    (COALESCE(OLD.model = NEW.model, true)) AND
    (COALESCE(OLD.serial_number = NEW.serial_number, true)) AND
    (COALESCE(OLD.weight = NEW.weight, true)) AND
    (COALESCE(OLD.purpose = NEW.purpose, true)) AND
    (COALESCE(OLD.created_at = NEW.created_at, true)) AND
    (COALESCE(OLD.registration_id = NEW.registration_id, true))
  ); 