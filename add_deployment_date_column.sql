-- Add deployment_date column to assets table
-- Run this SQL to fix the missing column issue

-- For SQLite (Electron app)
ALTER TABLE assets ADD COLUMN deployment_date TEXT;

-- For PostgreSQL (Supabase)
-- ALTER TABLE assets ADD COLUMN deployment_date TIMESTAMP;
