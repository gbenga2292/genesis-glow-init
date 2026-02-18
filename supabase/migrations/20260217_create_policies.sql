-- Create RLS Policies for all tables
-- Migration: RLS Policies
-- Created: 2026-02-17

-- ============================================
-- PROFILES TABLE POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (except role and permissions)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM profiles WHERE id = auth.uid()) -- Can't change own role
  );

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (auth.is_admin());

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (auth.is_admin());

-- Admins can insert profiles (for manual user creation)
CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (auth.is_admin());

-- Admins can delete profiles
CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  USING (auth.is_admin());

-- ============================================
-- ASSETS TABLE POLICIES
-- ============================================

-- All authenticated users can view assets
CREATE POLICY "Authenticated users can view assets"
  ON assets FOR SELECT
  USING (auth.role() = 'authenticated');

-- Managers and admins can create assets
CREATE POLICY "Managers can create assets"
  ON assets FOR INSERT
  WITH CHECK (auth.is_manager_or_admin());

-- Managers and admins can update assets
CREATE POLICY "Managers can update assets"
  ON assets FOR UPDATE
  USING (auth.is_manager_or_admin());

-- Only admins can delete assets
CREATE POLICY "Admins can delete assets"
  ON assets FOR DELETE
  USING (auth.is_admin());

-- ============================================
-- WAYBILLS TABLE POLICIES
-- ============================================

-- All authenticated users can view waybills
CREATE POLICY "Authenticated users can view waybills"
  ON waybills FOR SELECT
  USING (auth.role() = 'authenticated');

-- Managers and admins can create waybills
CREATE POLICY "Managers can create waybills"
  ON waybills FOR INSERT
  WITH CHECK (auth.is_manager_or_admin());

-- Managers and admins can update waybills
CREATE POLICY "Managers can update waybills"
  ON waybills FOR UPDATE
  USING (auth.is_manager_or_admin());

-- Only admins can delete waybills
CREATE POLICY "Admins can delete waybills"
  ON waybills FOR DELETE
  USING (auth.is_admin());

-- ============================================
-- SITES TABLE POLICIES
-- ============================================

-- All authenticated users can view sites
CREATE POLICY "Authenticated users can view sites"
  ON sites FOR SELECT
  USING (auth.role() = 'authenticated');

-- Managers and admins can create sites
CREATE POLICY "Managers can create sites"
  ON sites FOR INSERT
  WITH CHECK (auth.is_manager_or_admin());

-- Managers and admins can update sites
CREATE POLICY "Managers can update sites"
  ON sites FOR UPDATE
  USING (auth.is_manager_or_admin());

-- Only admins can delete sites
CREATE POLICY "Admins can delete sites"
  ON sites FOR DELETE
  USING (auth.is_admin());

-- ============================================
-- EMPLOYEES TABLE POLICIES
-- ============================================

-- All authenticated users can view employees
CREATE POLICY "Authenticated users can view employees"
  ON employees FOR SELECT
  USING (auth.role() = 'authenticated');

-- Managers and admins can manage employees
CREATE POLICY "Managers can create employees"
  ON employees FOR INSERT
  WITH CHECK (auth.is_manager_or_admin());

CREATE POLICY "Managers can update employees"
  ON employees FOR UPDATE
  USING (auth.is_manager_or_admin());

CREATE POLICY "Admins can delete employees"
  ON employees FOR DELETE
  USING (auth.is_admin());

-- ============================================
-- VEHICLES TABLE POLICIES
-- ============================================

-- All authenticated users can view vehicles
CREATE POLICY "Authenticated users can view vehicles"
  ON vehicles FOR SELECT
  USING (auth.role() = 'authenticated');

-- Managers and admins can manage vehicles
CREATE POLICY "Managers can create vehicles"
  ON vehicles FOR INSERT
  WITH CHECK (auth.is_manager_or_admin());

CREATE POLICY "Managers can update vehicles"
  ON vehicles FOR UPDATE
  USING (auth.is_manager_or_admin());

CREATE POLICY "Admins can delete vehicles"
  ON vehicles FOR DELETE
  USING (auth.is_admin());

-- ============================================
-- QUICK CHECKOUTS TABLE POLICIES
-- ============================================

-- All authenticated users can view checkouts
CREATE POLICY "Authenticated users can view checkouts"
  ON quick_checkouts FOR SELECT
  USING (auth.role() = 'authenticated');

-- All authenticated users can create checkouts
CREATE POLICY "Authenticated users can create checkouts"
  ON quick_checkouts FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Users can update their own checkouts, managers can update all
CREATE POLICY "Users can update own checkouts"
  ON quick_checkouts FOR UPDATE
  USING (
    auth.is_manager_or_admin() OR
    created_by = (SELECT username FROM profiles WHERE id = auth.uid())
  );

-- Only admins can delete checkouts
CREATE POLICY "Admins can delete checkouts"
  ON quick_checkouts FOR DELETE
  USING (auth.is_admin());

-- ============================================
-- EQUIPMENT LOGS TABLE POLICIES
-- ============================================

-- All authenticated users can view equipment logs
CREATE POLICY "Authenticated users can view equipment logs"
  ON equipment_logs FOR SELECT
  USING (auth.role() = 'authenticated');

-- All authenticated users can create equipment logs
CREATE POLICY "Authenticated users can create equipment logs"
  ON equipment_logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Users can update their own logs, managers can update all
CREATE POLICY "Users can update own equipment logs"
  ON equipment_logs FOR UPDATE
  USING (
    auth.is_manager_or_admin() OR
    logged_by = (SELECT username FROM profiles WHERE id = auth.uid())
  );

-- Only admins can delete equipment logs
CREATE POLICY "Admins can delete equipment logs"
  ON equipment_logs FOR DELETE
  USING (auth.is_admin());

-- ============================================
-- MAINTENANCE LOGS TABLE POLICIES
-- ============================================

-- All authenticated users can view maintenance logs
CREATE POLICY "Authenticated users can view maintenance logs"
  ON maintenance_logs FOR SELECT
  USING (auth.role() = 'authenticated');

-- Managers and admins can create maintenance logs
CREATE POLICY "Managers can create maintenance logs"
  ON maintenance_logs FOR INSERT
  WITH CHECK (auth.is_manager_or_admin());

-- Managers and admins can update maintenance logs
CREATE POLICY "Managers can update maintenance logs"
  ON maintenance_logs FOR UPDATE
  USING (auth.is_manager_or_admin());

-- Only admins can delete maintenance logs
CREATE POLICY "Admins can delete maintenance logs"
  ON maintenance_logs FOR DELETE
  USING (auth.is_admin());

-- ============================================
-- CONSUMABLE USAGE LOGS TABLE POLICIES
-- ============================================

-- All authenticated users can view consumable logs
CREATE POLICY "Authenticated users can view consumable logs"
  ON consumable_usage_logs FOR SELECT
  USING (auth.role() = 'authenticated');

-- All authenticated users can create consumable logs
CREATE POLICY "Authenticated users can create consumable logs"
  ON consumable_usage_logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Managers and admins can update consumable logs
CREATE POLICY "Managers can update consumable logs"
  ON consumable_usage_logs FOR UPDATE
  USING (auth.is_manager_or_admin());

-- Only admins can delete consumable logs
CREATE POLICY "Admins can delete consumable logs"
  ON consumable_usage_logs FOR DELETE
  USING (auth.is_admin());

-- ============================================
-- SITE TRANSACTIONS TABLE POLICIES
-- ============================================

-- All authenticated users can view site transactions
CREATE POLICY "Authenticated users can view site transactions"
  ON site_transactions FOR SELECT
  USING (auth.role() = 'authenticated');

-- System can create site transactions (via triggers)
CREATE POLICY "System can create site transactions"
  ON site_transactions FOR INSERT
  WITH CHECK (true);

-- Only admins can update site transactions
CREATE POLICY "Admins can update site transactions"
  ON site_transactions FOR UPDATE
  USING (auth.is_admin());

-- Only admins can delete site transactions
CREATE POLICY "Admins can delete site transactions"
  ON site_transactions FOR DELETE
  USING (auth.is_admin());

-- ============================================
-- ACTIVITY LOGS TABLE POLICIES
-- ============================================

-- All authenticated users can view activity logs
CREATE POLICY "Authenticated users can view activity logs"
  ON activity_logs FOR SELECT
  USING (auth.role() = 'authenticated');

-- System can create activity logs
CREATE POLICY "System can create activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK (true);

-- Only admins can delete activity logs
CREATE POLICY "Admins can delete activity logs"
  ON activity_logs FOR DELETE
  USING (auth.is_admin());

-- ============================================
-- COMPANY SETTINGS TABLE POLICIES
-- ============================================

-- All authenticated users can view company settings
CREATE POLICY "Authenticated users can view company settings"
  ON company_settings FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can update company settings
CREATE POLICY "Admins can update company settings"
  ON company_settings FOR UPDATE
  USING (auth.is_admin());

-- ============================================
-- NOTIFICATIONS TABLE POLICIES
-- ============================================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (
    user_id = (SELECT username FROM profiles WHERE id = auth.uid()) OR
    auth.is_admin()
  );

-- System can create notifications
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = (SELECT username FROM profiles WHERE id = auth.uid()));

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (user_id = (SELECT username FROM profiles WHERE id = auth.uid()));

-- ============================================
-- REQUESTS TABLE POLICIES
-- ============================================

-- All authenticated users can view requests
CREATE POLICY "Authenticated users can view requests"
  ON requests FOR SELECT
  USING (auth.role() = 'authenticated');

-- All authenticated users can create requests
CREATE POLICY "Authenticated users can create requests"
  ON requests FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Users can update their own requests, managers can update all
CREATE POLICY "Users can update own requests"
  ON requests FOR UPDATE
  USING (
    auth.is_manager_or_admin() OR
    requested_by = (SELECT username FROM profiles WHERE id = auth.uid())
  );

-- Only admins can delete requests
CREATE POLICY "Admins can delete requests"
  ON requests FOR DELETE
  USING (auth.is_admin());

-- ============================================
-- METRICS SNAPSHOTS TABLE POLICIES
-- ============================================

-- All authenticated users can view metrics
CREATE POLICY "Authenticated users can view metrics"
  ON metrics_snapshots FOR SELECT
  USING (auth.role() = 'authenticated');

-- System can create metrics snapshots
CREATE POLICY "System can create metrics snapshots"
  ON metrics_snapshots FOR INSERT
  WITH CHECK (true);

-- Only admins can delete old metrics
CREATE POLICY "Admins can delete metrics"
  ON metrics_snapshots FOR DELETE
  USING (auth.is_admin());

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "Users can view own profile" ON profiles IS 'Users can view their own profile information';
COMMENT ON POLICY "Admins can view all profiles" ON profiles IS 'Admins have full visibility of all user profiles';
COMMENT ON POLICY "Authenticated users can view assets" ON assets IS 'All logged-in users can view inventory';
COMMENT ON POLICY "Managers can create assets" ON assets IS 'Only managers and admins can add new assets';
