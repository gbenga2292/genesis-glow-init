-- Complete schema-only dump (reconstructed). Verify before use.

-- Enum types
CREATE TYPE public.app_role AS ENUM ('admin','data_entry_supervisor','regulatory','manager','staff');

-- Sequences
CREATE SEQUENCE IF NOT EXISTS public.users_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.sites_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.employees_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.vehicles_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.assets_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.quick_checkouts_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.equipment_logs_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.return_bills_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.return_items_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.saved_api_keys_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.metrics_snapshots_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.login_history_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.company_settings_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.maintenance_logs_id_seq;

-- Tables

CREATE TABLE public.users (
  id bigint PRIMARY KEY DEFAULT nextval('public.users_id_seq'::regclass),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL,
  name text NOT NULL,
  email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  signature_uploaded_at timestamptz,
  signature_removed_at timestamptz,
  signature_path text,
  mfa_enabled boolean DEFAULT false,
  mfa_secret text,
  last_active timestamptz,
  bio text,
  avatar text,
  avatar_color text,
  status text DEFAULT 'active'::text
);

COMMENT ON COLUMN public.users.signature_uploaded_at IS 'Timestamp when user uploaded or updated their signature';
COMMENT ON COLUMN public.users.signature_removed_at IS 'Timestamp when user removed their signature (for audit purposes)';

CREATE TABLE public.sites (
  id bigint PRIMARY KEY DEFAULT nextval('public.sites_id_seq'::regclass),
  name text NOT NULL,
  location text NOT NULL,
  description text,
  client_name text,
  contact_person text,
  phone text,
  service text,
  status text DEFAULT 'active'::text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.employees (
  id bigint PRIMARY KEY DEFAULT nextval('public.employees_id_seq'::regclass),
  name text NOT NULL,
  role text NOT NULL,
  phone text,
  email text,
  status text DEFAULT 'active'::text,
  delisted_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.vehicles (
  id bigint PRIMARY KEY DEFAULT nextval('public.vehicles_id_seq'::regclass),
  name text NOT NULL,
  type text,
  registration_number text,
  status text DEFAULT 'active'::text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  delisted_date date
);

CREATE TABLE public.assets (
  id bigint PRIMARY KEY DEFAULT nextval('public.assets_id_seq'::regclass),
  name text NOT NULL,
  description text,
  quantity integer DEFAULT 0 NOT NULL,
  unit_of_measurement text NOT NULL,
  category text,
  type text,
  location text,
  site_id bigint,
  service text,
  status text DEFAULT 'active'::text,
  condition text DEFAULT 'good'::text,
  missing_count integer DEFAULT 0,
  damaged_count integer DEFAULT 0,
  used_count integer DEFAULT 0,
  low_stock_level integer DEFAULT 10,
  critical_stock_level integer DEFAULT 5,
  power_source text,
  fuel_capacity numeric,
  fuel_consumption_rate numeric,
  electricity_consumption numeric,
  requires_logging boolean DEFAULT false,
  reserved_quantity integer DEFAULT 0,
  available_quantity integer DEFAULT 0,
  site_quantities text,
  purchase_date date,
  cost numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.waybills (
  id text PRIMARY KEY,
  site_id bigint,
  return_to_site_id bigint,
  driver_name text,
  vehicle text,
  issue_date timestamptz NOT NULL,
  expected_return_date timestamptz,
  purpose text NOT NULL,
  service text NOT NULL,
  status text DEFAULT 'outstanding'::text,
  type text DEFAULT 'waybill'::text,
  items jsonb,
  created_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  sent_to_site_date timestamptz,
  signature_url text,
  signature_name text
);

COMMENT ON COLUMN public.waybills.signature_url IS 'URL or data URI of the signature image';
COMMENT ON COLUMN public.waybills.signature_name IS 'Full name of the person who signed the waybill';

CREATE TABLE public.quick_checkouts (
  id bigint PRIMARY KEY DEFAULT nextval('public.quick_checkouts_id_seq'::regclass),
  asset_id bigint NOT NULL,
  employee_id bigint,
  quantity integer NOT NULL,
  checkout_date timestamptz NOT NULL,
  expected_return_days integer NOT NULL,
  returned_quantity integer DEFAULT 0,
  status text DEFAULT 'outstanding'::text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.equipment_logs (
  id bigint PRIMARY KEY DEFAULT nextval('public.equipment_logs_id_seq'::regclass),
  equipment_id bigint NOT NULL,
  equipment_name text NOT NULL,
  site_id bigint NOT NULL,
  date date NOT NULL,
  active boolean DEFAULT true,
  downtime_entries jsonb DEFAULT '[]'::jsonb,
  maintenance_details text,
  diesel_entered numeric,
  supervisor_on_site text,
  client_feedback text,
  issues_on_site text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.consumable_logs (
  id text PRIMARY KEY,
  consumable_id text NOT NULL,
  consumable_name text NOT NULL,
  site_id bigint NOT NULL,
  date date NOT NULL,
  quantity_used numeric NOT NULL,
  quantity_remaining numeric NOT NULL,
  unit text NOT NULL,
  used_for text NOT NULL,
  used_by text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.return_bills (
  id bigint PRIMARY KEY DEFAULT nextval('public.return_bills_id_seq'::regclass),
  waybill_id text NOT NULL,
  return_date timestamptz NOT NULL,
  received_by text NOT NULL,
  condition text DEFAULT 'good'::text,
  notes text,
  status text DEFAULT 'initiated'::text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.return_items (
  id bigint PRIMARY KEY DEFAULT nextval('public.return_items_id_seq'::regclass),
  return_bill_id bigint NOT NULL,
  asset_id bigint NOT NULL,
  quantity integer NOT NULL,
  condition text DEFAULT 'good'::text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.saved_api_keys (
  id bigint PRIMARY KEY DEFAULT nextval('public.saved_api_keys_id_seq'::regclass),
  key_name text UNIQUE NOT NULL,
  provider text NOT NULL,
  api_key text NOT NULL,
  endpoint text,
  model text,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.site_transactions (
  id text PRIMARY KEY,
  site_id bigint NOT NULL,
  asset_id bigint NOT NULL,
  asset_name text NOT NULL,
  transaction_type text NOT NULL,
  quantity integer NOT NULL,
  type text NOT NULL,
  reference_id text NOT NULL,
  reference_type text NOT NULL,
  condition text,
  notes text,
  created_by text,
  created_at timestamptz NOT NULL
);

CREATE TABLE public.activities (
  id text PRIMARY KEY,
  timestamp timestamptz NOT NULL,
  user_name text NOT NULL,
  user_id text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  details text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.metrics_snapshots (
  id bigint PRIMARY KEY DEFAULT nextval('public.metrics_snapshots_id_seq'::regclass),
  snapshot_date date UNIQUE NOT NULL,
  total_assets integer DEFAULT 0,
  total_quantity integer DEFAULT 0,
  outstanding_waybills integer DEFAULT 0,
  outstanding_checkouts integer DEFAULT 0,
  out_of_stock integer DEFAULT 0,
  low_stock integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id bigint NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.maintenance_logs (
  id bigint PRIMARY KEY DEFAULT nextval('public.maintenance_logs_id_seq'::regclass),
  machine_id text NOT NULL,
  maintenance_type text NOT NULL,
  reason text NOT NULL,
  date_started timestamptz NOT NULL,
  date_completed timestamptz,
  machine_active_at_time boolean DEFAULT true,
  downtime numeric,
  work_done text NOT NULL,
  parts_replaced text,
  technician text NOT NULL,
  cost numeric,
  location text,
  remarks text,
  service_reset boolean DEFAULT false,
  next_service_due timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.maintenance_logs
  ADD CONSTRAINT maintenance_logs_maintenance_type_check CHECK (maintenance_type = ANY (ARRAY['scheduled'::text, 'unscheduled'::text, 'emergency'::text]));

CREATE TABLE public.site_requests (
  id bigint PRIMARY KEY DEFAULT nextval('public.site_requests_id_seq'::regclass),
  site_id bigint,
  requestor_id text,
  requestor_name text,
  status text DEFAULT 'pending'::text,
  priority text DEFAULT 'medium'::text,
  items jsonb DEFAULT '[]'::jsonb,
  notes text,
  waybill_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  approved_by text
);

CREATE TABLE public.login_history (
  id integer PRIMARY KEY DEFAULT nextval('public.login_history_id_seq'::regclass),
  user_id integer NOT NULL,
  timestamp timestamptz DEFAULT now(),
  ip_address text,
  device_info text,
  location text,
  login_type text DEFAULT 'password'::text,
  status text DEFAULT 'success'::text,
  failure_reason text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.company_settings (
  id bigint PRIMARY KEY DEFAULT nextval('public.company_settings_id_seq'::regclass),
  company_name text,
  logo text,
  address text,
  phone text,
  email text,
  website text,
  currency text DEFAULT 'USD'::text,
  date_format text DEFAULT 'MM/DD/YYYY'::text,
  theme text DEFAULT 'light'::text,
  notifications_email boolean DEFAULT true,
  notifications_push boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Foreign keys

ALTER TABLE public.login_history
  ADD CONSTRAINT login_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE public.assets
  ADD CONSTRAINT assets_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id);

ALTER TABLE public.quick_checkouts
  ADD CONSTRAINT quick_checkouts_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id),
  ADD CONSTRAINT quick_checkouts_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);

ALTER TABLE public.equipment_logs
  ADD CONSTRAINT equipment_logs_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id),
  ADD CONSTRAINT equipment_logs_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.assets(id);

ALTER TABLE public.consumable_logs
  ADD CONSTRAINT consumable_logs_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id);

ALTER TABLE public.return_items
  ADD CONSTRAINT return_items_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id),
  ADD CONSTRAINT return_items_return_bill_id_fkey FOREIGN KEY (return_bill_id) REFERENCES public.return_bills(id);

ALTER TABLE public.site_transactions
  ADD CONSTRAINT site_transactions_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id),
  ADD CONSTRAINT site_transactions_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id);

ALTER TABLE public.site_requests
  ADD CONSTRAINT site_requests_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id);

ALTER TABLE public.waybills
  ADD CONSTRAINT waybills_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id),
  ADD CONSTRAINT waybills_return_to_site_id_fkey FOREIGN KEY (return_to_site_id) REFERENCES public.sites(id);

-- Indexes (useful for RLS and performance)
CREATE INDEX IF NOT EXISTS idx_assets_site_id ON public.assets(site_id);
CREATE INDEX IF NOT EXISTS idx_quick_checkouts_asset_id ON public.quick_checkouts(asset_id);
CREATE INDEX IF NOT EXISTS idx_quick_checkouts_employee_id ON public.quick_checkouts(employee_id);
CREATE INDEX IF NOT EXISTS idx_equipment_logs_equipment_id ON public.equipment_logs(equipment_id);
CREATE INDEX IF NOT EXISTS idx_site_transactions_site_id ON public.site_transactions(site_id);
CREATE INDEX IF NOT EXISTS idx_site_transactions_asset_id ON public.site_transactions(asset_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON public.login_history(user_id);

-- Enable RLS on tables that had it enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waybills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumable_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metrics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies (extracted and reconstructed)
-- Note: many policies reference auth.role() or allow anon; these are recreated from the extracted policy expressions.

-- public.users
CREATE POLICY "Allow authenticated users full access" ON public.users
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated'::text);

CREATE POLICY "anon_users" ON public.users
  FOR ALL TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- public.sites
CREATE POLICY "Allow authenticated users full access" ON public.sites
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated'::text);

CREATE POLICY "anon_sites" ON public.sites
  FOR ALL TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- public.employees
CREATE POLICY "Allow authenticated users full access" ON public.employees
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated'::text);

CREATE POLICY "anon_employees" ON public.employees
  FOR ALL TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- public.vehicles
CREATE POLICY "Allow authenticated users full access" ON public.vehicles
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated'::text);

CREATE POLICY "anon_vehicles" ON public.vehicles
  FOR ALL TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- public.assets
CREATE POLICY "Allow authenticated users full access" ON public.assets
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated'::text);

CREATE POLICY "anon_assets" ON public.assets
  FOR ALL TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- public.waybills
CREATE POLICY "Allow authenticated users full access" ON public.waybills
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated'::text);

CREATE POLICY "anon_waybills" ON public.waybills
  FOR ALL TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- public.quick_checkouts
CREATE POLICY "Allow authenticated users full access" ON public.quick_checkouts
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated'::text);

CREATE POLICY "anon_quick_checkouts" ON public.quick_checkouts
  FOR ALL TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- public.equipment_logs
CREATE POLICY "Allow authenticated users full access" ON public.equipment_logs
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated'::text);

CREATE POLICY "anon_equipment_logs" ON public.equipment_logs
  FOR ALL TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- public.consumable_logs
CREATE POLICY "Allow authenticated users full access" ON public.consumable_logs
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated'::text);

CREATE POLICY "anon_consumable_logs" ON public.consumable_logs
  FOR ALL TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- public.return_bills
CREATE POLICY "Allow authenticated users full access" ON public.return_bills
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated'::text);

CREATE POLICY "anon_return_bills" ON public.return_bills
  FOR ALL TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- public.return_items
CREATE POLICY "Allow authenticated users full access" ON public.return_items
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated'::text);

CREATE POLICY "anon_return_items" ON public.return_items
  FOR ALL TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- public.saved_api_keys
CREATE POLICY "Allow authenticated users full access" ON public.saved_api_keys
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated'::text);

CREATE POLICY "anon_saved_api_keys" ON public.saved_api_keys
  FOR ALL TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- public.site_transactions
CREATE POLICY "Allow authenticated users full access" ON public.site_transactions
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated'::text);

CREATE POLICY "anon_site_transactions" ON public.site_transactions
  FOR ALL TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- public.activities
CREATE POLICY "Allow authenticated users full access" ON public.activities
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated'::text);

CREATE POLICY "anon_activities" ON public.activities
  FOR ALL TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- public.metrics_snapshots
CREATE POLICY "Allow authenticated users full access" ON public.metrics_snapshots
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated'::text);

CREATE POLICY "anon_metrics_snapshots" ON public.metrics_snapshots
  FOR ALL TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- public.user_roles
CREATE POLICY "anon_user_roles" ON public.user_roles
  FOR ALL TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- public.maintenance_logs
CREATE POLICY "Allow authenticated users full access" ON public.maintenance_logs
  FOR ALL TO authenticated
  USING (auth.role() = 'authenticated'::text);

CREATE POLICY "anon_maintenance_logs" ON public.maintenance_logs
  FOR ALL TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- public.site_requests
CREATE POLICY "Allow anon full access" ON public.site_requests
  FOR ALL TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- public.login_history
CREATE POLICY "Allow all access to login_history" ON public.login_history
  FOR ALL TO PUBLIC
  USING (true)
  WITH CHECK (true);

-- public.company_settings
CREATE POLICY "Allow authenticated users to read company settings" ON public.company_settings
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to update company settings" ON public.company_settings
  FOR UPDATE TO authenticated
  USING (true);

-- End of RLS policies

-- Final notes:
-- 1) This dump reproduces table structures, sequences, FKs, constraints, indexes, RLS enabling, and policies as extracted.
-- 2) I could not extract ownership of sequences, more specific index definitions, trigger functions, or views from the initial metadata—add them manually if required.
-- 3) Test this in a dev environment before applying to production.