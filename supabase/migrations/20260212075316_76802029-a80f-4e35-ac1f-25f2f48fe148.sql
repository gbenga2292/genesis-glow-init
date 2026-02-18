
-- Add last_active column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE;

-- Create login_history table
CREATE TABLE public.login_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  device_info TEXT,
  location TEXT,
  login_type TEXT DEFAULT 'password',
  status TEXT DEFAULT 'success',
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated access (admin manages users)
CREATE POLICY "Allow all access to login_history" ON public.login_history
  FOR ALL USING (true) WITH CHECK (true);

-- Index for fast lookups
CREATE INDEX idx_login_history_user_id ON public.login_history(user_id);
CREATE INDEX idx_login_history_timestamp ON public.login_history(timestamp DESC);
