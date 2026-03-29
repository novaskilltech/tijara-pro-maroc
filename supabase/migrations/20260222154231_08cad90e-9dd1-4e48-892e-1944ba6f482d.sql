
-- Add global discount fields to quotations
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS global_discount_type text NOT NULL DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS global_discount_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS global_discount_amount numeric NOT NULL DEFAULT 0;

-- Add global discount fields to sales_orders
ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS global_discount_type text NOT NULL DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS global_discount_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS global_discount_amount numeric NOT NULL DEFAULT 0;

-- Add global discount fields to purchase_orders
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS global_discount_type text NOT NULL DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS global_discount_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS global_discount_amount numeric NOT NULL DEFAULT 0;

-- Add global discount fields to invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS global_discount_type text NOT NULL DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS global_discount_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS global_discount_amount numeric NOT NULL DEFAULT 0;
