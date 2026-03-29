-- Add credit_limit to suppliers table
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS credit_limit numeric NOT NULL DEFAULT 0;
