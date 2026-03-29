
-- Add total columns to purchase_requests
ALTER TABLE public.purchase_requests
  ADD COLUMN IF NOT EXISTS total_ht numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_tva numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_ttc numeric NOT NULL DEFAULT 0;

-- Backfill existing purchase requests from their lines
UPDATE public.purchase_requests pr
SET
  total_ht = COALESCE(sub.sum_ht, 0),
  total_tva = COALESCE(sub.sum_tva, 0),
  total_ttc = COALESCE(sub.sum_ttc, 0)
FROM (
  SELECT
    request_id,
    SUM(
      COALESCE(supplier_unit_price, estimated_cost, 0) * quantity * (1 - COALESCE(supplier_discount_percent, 0) / 100.0)
    ) AS sum_ht,
    SUM(
      COALESCE(supplier_unit_price, estimated_cost, 0) * quantity * (1 - COALESCE(supplier_discount_percent, 0) / 100.0)
      * COALESCE(COALESCE(supplier_tva_rate, tva_rate), 0) / 100.0
    ) AS sum_tva,
    SUM(
      COALESCE(supplier_unit_price, estimated_cost, 0) * quantity * (1 - COALESCE(supplier_discount_percent, 0) / 100.0)
      * (1 + COALESCE(COALESCE(supplier_tva_rate, tva_rate), 0) / 100.0)
    ) AS sum_ttc
  FROM public.purchase_request_lines
  GROUP BY request_id
) sub
WHERE pr.id = sub.request_id;
