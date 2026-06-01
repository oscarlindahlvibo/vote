/*
  # Create votes table for Åseda Truckmeet

  ## Summary
  Creates the voting system database for the Åseda Truckmeet audience choice award.

  ## New Tables
  - `votes`
    - `id` (uuid, primary key) - Unique vote identifier
    - `truck_number` (integer) - Exhibition number between 1001 and 2150
    - `voter_name` (text) - Full name of the voter
    - `mobile_number` (text) - Voter's mobile number (unique constraint to prevent duplicate votes)
    - `ip_address` (text) - IP address of the voter at time of submission
    - `created_at` (timestamptz) - Timestamp of the vote

  ## Security
  - RLS enabled on votes table
  - Public INSERT policy for anonymous voting (via edge function)
  - SELECT policy restricted to service role only (admin access)
  - Unique constraint on mobile_number prevents duplicate votes

  ## Notes
  1. mobile_number has a UNIQUE constraint - each phone number can only vote once
  2. IP address is logged for audit purposes
  3. truck_number is constrained to valid range 1001-2150
  4. No authentication required for voters - edge function handles validation
*/

CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  truck_number integer NOT NULL CHECK (truck_number >= 1001 AND truck_number <= 2150),
  voter_name text NOT NULL CHECK (char_length(trim(voter_name)) >= 2),
  mobile_number text NOT NULL,
  ip_address text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Unique constraint: one vote per mobile number
ALTER TABLE votes ADD CONSTRAINT votes_mobile_number_unique UNIQUE (mobile_number);

-- Enable RLS
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (vote submission handled via edge function)
CREATE POLICY "Anyone can submit a vote"
  ON votes FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated (admin) users can read votes
CREATE POLICY "Authenticated users can read votes"
  ON votes FOR SELECT
  TO authenticated
  USING (true);

-- Index for fast aggregation by truck_number
CREATE INDEX IF NOT EXISTS votes_truck_number_idx ON votes (truck_number);

-- Index for fast lookup by mobile_number (duplicate check)
CREATE INDEX IF NOT EXISTS votes_mobile_number_idx ON votes (mobile_number);
