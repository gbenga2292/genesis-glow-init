-- Enable Row Level Security on all tables
-- Migration: Enable RLS
-- Created: 2026-02-17

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

-- Users table (will be replaced by auth.users)
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;

-- Core tables
ALTER TABLE IF EXISTS assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS waybills ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS vehicles ENABLE ROW LEVEL SECURITY;

-- Activity and logging tables
ALTER TABLE IF EXISTS quick_checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS equipment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS consumable_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS site_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS activity_logs ENABLE ROW LEVEL SECURITY;

-- Settings and configuration
ALTER TABLE IF EXISTS company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;

-- Requests and returns
ALTER TABLE IF EXISTS requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS return_bills ENABLE ROW LEVEL SECURITY;

-- Metrics and snapshots
ALTER TABLE IF EXISTS metrics_snapshots ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE PROFILES TABLE (linked to auth.users)
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'staff', 'site_worker')),
  email TEXT,
  phone TEXT,
  avatar TEXT,
  signature TEXT,
  permissions JSONB DEFAULT '[]'::jsonb,
  preferences JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create index on username for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get user role from JWT
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT role FROM profiles WHERE id = auth.uid()),
    'staff'
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
  SELECT auth.user_role() = 'admin';
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Function to check if user is manager or admin
CREATE OR REPLACE FUNCTION auth.is_manager_or_admin()
RETURNS BOOLEAN AS $$
  SELECT auth.user_role() IN ('admin', 'manager');
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to update updated_at on profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, name, role, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff'),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE profiles IS 'User profiles linked to auth.users. Contains role, permissions, and preferences.';
COMMENT ON FUNCTION auth.user_role() IS 'Returns the role of the currently authenticated user';
COMMENT ON FUNCTION auth.is_admin() IS 'Returns true if the current user is an admin';
COMMENT ON FUNCTION auth.is_manager_or_admin() IS 'Returns true if the current user is a manager or admin';
