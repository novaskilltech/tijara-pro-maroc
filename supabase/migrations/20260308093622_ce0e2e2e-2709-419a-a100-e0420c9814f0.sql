
-- Add supplier response fields to purchase_requests header
ALTER TABLE public.purchase_requests
  ADD COLUMN IF NOT EXISTS supplier_response_date date NULL,
  ADD COLUMN IF NOT EXISTS supplier_notes text NULL;

-- Add supplier response fields to purchase_request_lines
ALTER TABLE public.purchase_request_lines
  ADD COLUMN IF NOT EXISTS supplier_unit_price numeric NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supplier_discount_percent numeric NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supplier_tva_rate numeric NULL,
  ADD COLUMN IF NOT EXISTS supplier_line_total numeric NULL DEFAULT 0;
