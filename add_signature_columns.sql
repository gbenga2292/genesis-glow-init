-- Add signature columns to waybills table
ALTER TABLE waybills 
ADD COLUMN IF NOT EXISTS signature_url TEXT,
ADD COLUMN IF NOT EXISTS signature_name TEXT;

-- Add comment to document the columns
COMMENT ON COLUMN waybills.signature_url IS 'URL or data URI of the signature image';
COMMENT ON COLUMN waybills.signature_name IS 'Full name of the person who signed the waybill';
