-- Add MFA columns to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS mfa_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS mfa_secret text;