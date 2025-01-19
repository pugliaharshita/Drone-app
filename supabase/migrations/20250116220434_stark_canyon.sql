/*
  # Drone Registration Database Schema

  1. New Tables
    - `owners`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `first_name` (text)
      - `last_name` (text)
      - `email` (text)
      - `pilot_license` (text)
      - `address` (text)
      - `city` (text)
      - `state` (text)
      - `zip_code` (text)
      - `created_at` (timestamptz)
      
    - `drones`
      - `id` (uuid, primary key)
      - `owner_id` (uuid, references owners)
      - `manufacturer` (text)
      - `model` (text)
      - `serial_number` (text)
      - `weight` (integer)
      - `purpose` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Policies to allow users to:
      - Read their own data
      - Insert their own data
      - Update their own data
*/

-- Create owners table
CREATE TABLE IF NOT EXISTS owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  pilot_license text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  zip_code text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create drones table
CREATE TABLE IF NOT EXISTS drones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES owners NOT NULL,
  manufacturer text NOT NULL,
  model text NOT NULL,
  serial_number text NOT NULL,
  weight integer NOT NULL,
  purpose text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(serial_number)
);

-- Enable Row Level Security
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE drones ENABLE ROW LEVEL SECURITY;

-- Policies for owners table
CREATE POLICY "Users can view own owner profile"
  ON owners FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own owner profile"
  ON owners FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own owner profile"
  ON owners FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policies for drones table
CREATE POLICY "Users can view own drones"
  ON drones FOR SELECT
  TO authenticated
  USING (owner_id IN (
    SELECT id FROM owners WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can register drones"
  ON drones FOR INSERT
  TO authenticated
  WITH CHECK (owner_id IN (
    SELECT id FROM owners WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update own drones"
  ON drones FOR UPDATE
  TO authenticated
  USING (owner_id IN (
    SELECT id FROM owners WHERE user_id = auth.uid()
  ))
  WITH CHECK (owner_id IN (
    SELECT id FROM owners WHERE user_id = auth.uid()
  ));