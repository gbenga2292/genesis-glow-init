
-- Create equipment_logs table
CREATE TABLE public.equipment_logs (
  id BIGSERIAL PRIMARY KEY,
  equipment_id TEXT NOT NULL,
  equipment_name TEXT NOT NULL,
  site_id TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  active BOOLEAN DEFAULT true,
  downtime_entries JSONB DEFAULT '[]',
  maintenance_details TEXT,
  diesel_entered NUMERIC,
  supervisor_on_site TEXT,
  client_feedback TEXT,
  issues_on_site TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for common queries
CREATE INDEX idx_equipment_logs_equipment_id ON public.equipment_logs(equipment_id);
CREATE INDEX idx_equipment_logs_site_id ON public.equipment_logs(site_id);
CREATE INDEX idx_equipment_logs_date ON public.equipment_logs(date);

-- Disable RLS since this app uses application-level auth (no Supabase Auth)
ALTER TABLE public.equipment_logs ENABLE ROW LEVEL SECURITY;

-- Allow all operations (app uses its own auth system)
CREATE POLICY "Allow all access to equipment_logs"
  ON public.equipment_logs FOR ALL
  USING (true)
  WITH CHECK (true);
