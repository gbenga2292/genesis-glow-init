-- Create Maintenance Logs Table
-- Run this in your Supabase SQL Editor to fix 404 error

CREATE TABLE IF NOT EXISTS maintenance_logs (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    machine_id BIGINT REFERENCES assets(id),
    maintenance_type TEXT NOT NULL,
    reason TEXT,
    date_started TIMESTAMPTZ NOT NULL,
    date_completed TIMESTAMPTZ,
    machine_active_at_time BOOLEAN DEFAULT false,
    downtime DECIMAL(10, 2),
    work_done TEXT,
    parts_replaced TEXT,
    technician TEXT,
    cost DECIMAL(10, 2),
    location TEXT,
    remarks TEXT,
    service_reset BOOLEAN DEFAULT false,
    next_service_due TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_machine_id ON maintenance_logs(machine_id);

-- Enable RLS
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;

-- Create policy
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'maintenance_logs' 
        AND policyname = 'Allow authenticated users full access'
    ) THEN
        CREATE POLICY "Allow authenticated users full access" ON maintenance_logs
        FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;
