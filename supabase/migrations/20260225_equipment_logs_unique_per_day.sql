-- Migration: Add unique constraint on equipment_logs (equipment_id, site_id, date)
-- This prevents more than one log per machine per site per day at the database level.
-- Run this AFTER the one-time cleanup script removes existing duplicates.

-- Step 1: Remove duplicate rows first — keep only the most recently updated per key
DELETE FROM equipment_logs
WHERE id NOT IN (
  SELECT DISTINCT ON (equipment_id, site_id, date::date) id
  FROM equipment_logs
  ORDER BY equipment_id, site_id, date::date, updated_at DESC NULLS LAST
);

-- Step 2: Add a unique index on the natural key
-- We use date::date to strip the time component so any timestamp on the same day matches
CREATE UNIQUE INDEX IF NOT EXISTS equipment_logs_unique_per_day
  ON equipment_logs (equipment_id, site_id, (date::date));
