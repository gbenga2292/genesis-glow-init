-- Create table for daily metrics snapshots
CREATE TABLE public.metrics_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL UNIQUE,
  total_assets integer NOT NULL DEFAULT 0,
  total_quantity integer NOT NULL DEFAULT 0,
  outstanding_waybills integer NOT NULL DEFAULT 0,
  outstanding_checkouts integer NOT NULL DEFAULT 0,
  out_of_stock integer NOT NULL DEFAULT 0,
  low_stock integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.metrics_snapshots ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Allow all on metrics_snapshots" 
ON public.metrics_snapshots 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create index on snapshot_date for faster queries
CREATE INDEX idx_metrics_snapshots_date ON public.metrics_snapshots(snapshot_date DESC);