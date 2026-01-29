-- Add delisted_date column to vehicles table
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS delisted_date DATE;

-- Update the policy to allow viewing delisted vehicles (all authenticated users can view)
-- The existing policy "Allow authenticated users full access" covers this, so no new policy needed if it's broad.
-- However, we might want to ensure older queries don't break.
