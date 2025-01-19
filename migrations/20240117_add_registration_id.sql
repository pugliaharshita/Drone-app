-- Add registration_id column to drones table
ALTER TABLE drones
ADD COLUMN registration_id text;

-- Create an index on registration_id for faster lookups
CREATE INDEX idx_drones_registration_id ON drones(registration_id);

-- Add a comment to document the column
COMMENT ON COLUMN drones.registration_id IS 'Unique registration ID for the drone'; 