
-- Add supplier_reference and currency_id to purchase_requests
ALTER TABLE public.purchase_requests
  ADD COLUMN IF NOT EXISTS supplier_reference text,
  ADD COLUMN IF NOT EXISTS currency_id uuid REFERENCES public.currencies(id);
