
-- Step 1: Add purchase role to enum (must commit before use)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'purchase';
