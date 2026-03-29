
-- Add banking fields to customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS bank_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS rib text DEFAULT '',
  ADD COLUMN IF NOT EXISTS account_number text DEFAULT '',
  ADD COLUMN IF NOT EXISTS iban text DEFAULT '',
  ADD COLUMN IF NOT EXISTS swift text DEFAULT '';

-- Add banking fields to suppliers
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS bank_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS rib text DEFAULT '',
  ADD COLUMN IF NOT EXISTS account_number text DEFAULT '',
  ADD COLUMN IF NOT EXISTS iban text DEFAULT '',
  ADD COLUMN IF NOT EXISTS swift text DEFAULT '';

-- Add secondary phone to both
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS phone2 text DEFAULT '';

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS phone2 text DEFAULT '';
