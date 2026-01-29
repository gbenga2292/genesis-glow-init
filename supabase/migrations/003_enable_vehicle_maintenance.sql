-- Enable vehicle maintenance logs by allowing alphanumeric IDs (e.g., 'vehicle-123')
-- and removing the strict foreign key constraint to the assets table.

-- 1. Drop the existing foreign key constraint
ALTER TABLE maintenance_logs 
DROP CONSTRAINT IF EXISTS maintenance_logs_machine_id_fkey;

-- 2. Alter the machine_id column type from BIGINT to TEXT to support 'vehicle-ID' format
ALTER TABLE maintenance_logs 
ALTER COLUMN machine_id TYPE TEXT;

-- 3. (Optional) Re-add a constraint if possible, but since we have mixed entities (Assets vs Vehicles),
-- strict FK is hard without a polymorphic schema. We rely on application logic.
