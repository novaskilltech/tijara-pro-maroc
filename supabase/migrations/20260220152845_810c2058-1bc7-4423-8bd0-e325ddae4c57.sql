
-- Step 2: Schema extensions (purchase role now committed)

-- 1. Extend purchase_requests
ALTER TABLE public.purchase_requests
  ADD COLUMN IF NOT EXISTS warehouse_id uuid REFERENCES public.warehouses(id),
  ADD COLUMN IF NOT EXISTS needed_date date,
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id),
  ADD COLUMN IF NOT EXISTS request_date date NOT NULL DEFAULT CURRENT_DATE;

UPDATE public.purchase_requests SET status = 'draft' WHERE status NOT IN ('draft','submitted','approved','refused','cancelled','validated');

-- 2. Add fields to purchase_request_lines
ALTER TABLE public.purchase_request_lines
  ADD COLUMN IF NOT EXISTS unit text DEFAULT 'Unité',
  ADD COLUMN IF NOT EXISTS estimated_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tva_rate numeric DEFAULT 0;

-- 3. Extend purchase_orders
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS expected_delivery_date date,
  ADD COLUMN IF NOT EXISTS payment_terms text DEFAULT '30j',
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_by uuid;

UPDATE public.purchase_orders SET status = 'confirmed' WHERE status = 'validated';

-- 4. Add purchase_request_id to purchase_orders
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS purchase_request_id uuid REFERENCES public.purchase_requests(id);

-- 5. Extend receptions
ALTER TABLE public.receptions
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS notes text;

-- 6. Extend invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS purchase_order_id uuid REFERENCES public.purchase_orders(id),
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS reception_id uuid REFERENCES public.receptions(id);

-- 7. invoice_reception_links
CREATE TABLE IF NOT EXISTS public.invoice_reception_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  reception_id uuid NOT NULL REFERENCES public.receptions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(invoice_id, reception_id)
);

ALTER TABLE public.invoice_reception_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view invoice_reception_links"
  ON public.invoice_reception_links FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and accountants can manage invoice_reception_links"
  ON public.invoice_reception_links FOR ALL
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'accountant'::app_role))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'accountant'::app_role));

-- 8. RLS for purchase_requests
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_requests' AND policyname = 'Auth users can view purchase requests') THEN
    EXECUTE $p$CREATE POLICY "Auth users can view purchase requests" ON public.purchase_requests FOR SELECT USING (auth.uid() IS NOT NULL)$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_requests' AND policyname = 'Staff can manage purchase requests') THEN
    EXECUTE $p$CREATE POLICY "Staff can manage purchase requests" ON public.purchase_requests FOR ALL
      USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'purchase'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))
      WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'purchase'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))$p$;
  END IF;
END$$;

-- 9. RLS for purchase_request_lines
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_request_lines' AND policyname = 'Auth users can view purchase request lines') THEN
    EXECUTE $p$CREATE POLICY "Auth users can view purchase request lines" ON public.purchase_request_lines FOR SELECT USING (auth.uid() IS NOT NULL)$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_request_lines' AND policyname = 'Staff can manage purchase request lines') THEN
    EXECUTE $p$CREATE POLICY "Staff can manage purchase request lines" ON public.purchase_request_lines FOR ALL
      USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'purchase'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))
      WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'purchase'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))$p$;
  END IF;
END$$;

-- 10. RLS for purchase_orders
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_orders' AND policyname = 'Auth users can view purchase orders') THEN
    EXECUTE $p$CREATE POLICY "Auth users can view purchase orders" ON public.purchase_orders FOR SELECT USING (auth.uid() IS NOT NULL)$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_orders' AND policyname = 'Staff can manage purchase orders') THEN
    EXECUTE $p$CREATE POLICY "Staff can manage purchase orders" ON public.purchase_orders FOR ALL
      USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'purchase'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))
      WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'purchase'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))$p$;
  END IF;
END$$;

-- 11. RLS for purchase_order_lines
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_order_lines' AND policyname = 'Auth users can view purchase order lines') THEN
    EXECUTE $p$CREATE POLICY "Auth users can view purchase order lines" ON public.purchase_order_lines FOR SELECT USING (auth.uid() IS NOT NULL)$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchase_order_lines' AND policyname = 'Staff can manage purchase order lines') THEN
    EXECUTE $p$CREATE POLICY "Staff can manage purchase order lines" ON public.purchase_order_lines FOR ALL
      USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'purchase'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))
      WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'purchase'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))$p$;
  END IF;
END$$;

-- 12. RLS for receptions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'receptions' AND policyname = 'Auth users can view receptions') THEN
    EXECUTE $p$CREATE POLICY "Auth users can view receptions" ON public.receptions FOR SELECT USING (auth.uid() IS NOT NULL)$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'receptions' AND policyname = 'Staff can manage receptions') THEN
    EXECUTE $p$CREATE POLICY "Staff can manage receptions" ON public.receptions FOR ALL
      USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'purchase'::app_role) OR has_role(auth.uid(), 'stock_manager'::app_role))
      WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'purchase'::app_role) OR has_role(auth.uid(), 'stock_manager'::app_role))$p$;
  END IF;
END$$;

-- 13. RLS for reception_lines
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reception_lines' AND policyname = 'Auth users can view reception lines') THEN
    EXECUTE $p$CREATE POLICY "Auth users can view reception lines" ON public.reception_lines FOR SELECT USING (auth.uid() IS NOT NULL)$p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reception_lines' AND policyname = 'Staff can manage reception lines') THEN
    EXECUTE $p$CREATE POLICY "Staff can manage reception lines" ON public.reception_lines FOR ALL
      USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'purchase'::app_role) OR has_role(auth.uid(), 'stock_manager'::app_role))
      WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'purchase'::app_role) OR has_role(auth.uid(), 'stock_manager'::app_role))$p$;
  END IF;
END$$;
