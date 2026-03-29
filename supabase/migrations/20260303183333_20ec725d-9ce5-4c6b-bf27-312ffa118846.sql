
-- ============================================================
-- FIX 1: company_settings — remove public SELECT, restrict to company members
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view company settings" ON public.company_settings;
CREATE POLICY "Authenticated users can view company settings"
  ON public.company_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);
-- NOTE: company_settings is a legacy singleton table without company_id.
-- Access is restricted to authenticated users only (no anon/public).
-- The multi-company architecture uses the 'companies' table instead.

-- ============================================================
-- FIX 2: payment_allocations — remove company_id IS NULL fallback
-- ============================================================
DROP POLICY IF EXISTS "Users view own company payment allocations" ON public.payment_allocations;
CREATE POLICY "Users view own company payment allocations"
  ON public.payment_allocations FOR SELECT
  USING (user_has_company(auth.uid(), company_id) OR is_admin(auth.uid()));

-- ============================================================
-- FIX 3: inventory_adjustment_lines — remove company_id IS NULL fallback
-- ============================================================
DROP POLICY IF EXISTS "Users view own company adjustment lines" ON public.inventory_adjustment_lines;
CREATE POLICY "Users view own company adjustment lines"
  ON public.inventory_adjustment_lines FOR SELECT
  USING (user_has_company(auth.uid(), company_id) OR is_admin(auth.uid()));

-- ============================================================
-- FIX 4: purchase_request_lines — add company_id + proper RLS
-- ============================================================
ALTER TABLE public.purchase_request_lines
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- Backfill company_id from parent purchase_requests
UPDATE public.purchase_request_lines prl
  SET company_id = pr.company_id
  FROM public.purchase_requests pr
  WHERE prl.request_id = pr.id
    AND prl.company_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_purchase_request_lines_company
  ON public.purchase_request_lines(company_id);

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Auth users can view purchase request lines" ON public.purchase_request_lines;

-- Replace with company-scoped SELECT
CREATE POLICY "Users view own company purchase request lines"
  ON public.purchase_request_lines FOR SELECT
  USING (user_has_company(auth.uid(), company_id) OR is_admin(auth.uid()));
