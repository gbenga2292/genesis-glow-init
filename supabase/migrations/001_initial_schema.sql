-- Genesis Glow Asset Manager - Supabase Schema Migration
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sites Table
CREATE TABLE sites (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  contact_person TEXT,
  phone TEXT,
  service TEXT, -- JSON array string for services
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employees Table
CREATE TABLE employees (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  status TEXT DEFAULT 'active',
  delisted_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicles Table
CREATE TABLE vehicles (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  registration_number TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assets Table
CREATE TABLE assets (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_of_measurement TEXT NOT NULL,
  category TEXT,
  type TEXT,
  location TEXT,
  site_id BIGINT REFERENCES sites(id),
  service TEXT,
  status TEXT DEFAULT 'active',
  condition TEXT DEFAULT 'good',
  missing_count INTEGER DEFAULT 0,
  damaged_count INTEGER DEFAULT 0,
  used_count INTEGER DEFAULT 0,
  low_stock_level INTEGER DEFAULT 10,
  critical_stock_level INTEGER DEFAULT 5,
  power_source TEXT,
  fuel_capacity DECIMAL(10, 2),
  fuel_consumption_rate DECIMAL(10, 2),
  electricity_consumption DECIMAL(10, 2),
  requires_logging BOOLEAN DEFAULT false,
  reserved_quantity INTEGER DEFAULT 0,
  available_quantity INTEGER DEFAULT 0,
  site_quantities TEXT, -- JSON string for site quantity mappings
  purchase_date DATE,
  cost DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Waybills Table
CREATE TABLE waybills (
  id TEXT PRIMARY KEY,
  site_id BIGINT REFERENCES sites(id),
  return_to_site_id BIGINT REFERENCES sites(id),
  driver_name TEXT,
  vehicle TEXT,
  issue_date TIMESTAMPTZ NOT NULL,
  expected_return_date TIMESTAMPTZ,
  purpose TEXT NOT NULL,
  service TEXT NOT NULL,
  status TEXT DEFAULT 'outstanding',
  type TEXT DEFAULT 'waybill',
  items JSONB,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_to_site_date TIMESTAMPTZ
);

-- Quick Checkouts Table
CREATE TABLE quick_checkouts (
  id BIGSERIAL PRIMARY KEY,
  asset_id BIGINT NOT NULL REFERENCES assets(id),
  employee_id BIGINT REFERENCES employees(id),
  quantity INTEGER NOT NULL,
  checkout_date TIMESTAMPTZ NOT NULL,
  expected_return_days INTEGER NOT NULL,
  returned_quantity INTEGER DEFAULT 0,
  status TEXT DEFAULT 'outstanding',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment Logs Table
CREATE TABLE equipment_logs (
  id BIGSERIAL PRIMARY KEY,
  equipment_id BIGINT NOT NULL REFERENCES assets(id),
  equipment_name TEXT NOT NULL,
  site_id BIGINT NOT NULL REFERENCES sites(id),
  date DATE NOT NULL,
  active BOOLEAN DEFAULT true,
  downtime_entries JSONB DEFAULT '[]',
  maintenance_details TEXT,
  diesel_entered DECIMAL(10, 2),
  supervisor_on_site TEXT,
  client_feedback TEXT,
  issues_on_site TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Consumable Logs Table
CREATE TABLE consumable_logs (
  id TEXT PRIMARY KEY,
  consumable_id TEXT NOT NULL,
  consumable_name TEXT NOT NULL,
  site_id BIGINT NOT NULL REFERENCES sites(id),
  date DATE NOT NULL,
  quantity_used DECIMAL(10, 2) NOT NULL,
  quantity_remaining DECIMAL(10, 2) NOT NULL,
  unit TEXT NOT NULL,
  used_for TEXT NOT NULL,
  used_by TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Return Bills Table
CREATE TABLE return_bills (
  id BIGSERIAL PRIMARY KEY,
  waybill_id TEXT NOT NULL,
  return_date TIMESTAMPTZ NOT NULL,
  received_by TEXT NOT NULL,
  condition TEXT DEFAULT 'good',
  notes TEXT,
  status TEXT DEFAULT 'initiated',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Return Items Table
CREATE TABLE return_items (
  id BIGSERIAL PRIMARY KEY,
  return_bill_id BIGINT NOT NULL REFERENCES return_bills(id),
  asset_id BIGINT NOT NULL REFERENCES assets(id),
  quantity INTEGER NOT NULL,
  condition TEXT DEFAULT 'good',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company Settings Table
CREATE TABLE company_settings (
  id BIGSERIAL PRIMARY KEY,
  company_name TEXT NOT NULL,
  logo TEXT,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  website TEXT,
  currency TEXT DEFAULT 'USD',
  date_format TEXT DEFAULT 'MM/dd/yyyy',
  theme TEXT DEFAULT 'system',
  notifications_email BOOLEAN DEFAULT true,
  notifications_push BOOLEAN DEFAULT true,
  ai_config TEXT, -- JSON string for AI config
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved API Keys Table
CREATE TABLE saved_api_keys (
  id BIGSERIAL PRIMARY KEY,
  key_name TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  api_key TEXT NOT NULL,
  endpoint TEXT,
  model TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Site Transactions Table
CREATE TABLE site_transactions (
  id TEXT PRIMARY KEY,
  site_id BIGINT NOT NULL REFERENCES sites(id),
  asset_id BIGINT NOT NULL REFERENCES assets(id),
  asset_name TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  type TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  reference_type TEXT NOT NULL,
  condition TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL
);

-- Activities Table
CREATE TABLE activities (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  user_name TEXT NOT NULL,
  user_id TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Metrics Snapshots Table
CREATE TABLE metrics_snapshots (
  id BIGSERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL UNIQUE,
  total_assets INTEGER DEFAULT 0,
  total_quantity INTEGER DEFAULT 0,
  outstanding_waybills INTEGER DEFAULT 0,
  outstanding_checkouts INTEGER DEFAULT 0,
  out_of_stock INTEGER DEFAULT 0,
  low_stock INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_assets_site_id ON assets(site_id);
CREATE INDEX idx_assets_category ON assets(category);
CREATE INDEX idx_assets_type ON assets(type);
CREATE INDEX idx_waybills_site_id ON waybills(site_id);
CREATE INDEX idx_waybills_status ON waybills(status);
CREATE INDEX idx_quick_checkouts_asset_id ON quick_checkouts(asset_id);
CREATE INDEX idx_quick_checkouts_employee_id ON quick_checkouts(employee_id);
CREATE INDEX idx_equipment_logs_equipment_id ON equipment_logs(equipment_id);
CREATE INDEX idx_equipment_logs_site_id ON equipment_logs(site_id);
CREATE INDEX idx_site_transactions_site_id ON site_transactions(site_id);
CREATE INDEX idx_site_transactions_asset_id ON site_transactions(asset_id);
CREATE INDEX idx_activities_timestamp ON activities(timestamp);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE waybills ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumable_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics_snapshots ENABLE ROW LEVEL SECURITY;

-- Create policies (Allow authenticated users to read/write all tables for now)
-- You can refine these later based on user roles

CREATE POLICY "Allow authenticated users full access" ON users
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users full access" ON sites
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users full access" ON employees
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users full access" ON vehicles
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users full access" ON assets
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users full access" ON waybills
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users full access" ON quick_checkouts
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users full access" ON equipment_logs
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users full access" ON consumable_logs
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users full access" ON return_bills
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users full access" ON return_items
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users full access" ON company_settings
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users full access" ON saved_api_keys
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users full access" ON site_transactions
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users full access" ON activities
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users full access" ON metrics_snapshots
  FOR ALL USING (auth.role() = 'authenticated');
