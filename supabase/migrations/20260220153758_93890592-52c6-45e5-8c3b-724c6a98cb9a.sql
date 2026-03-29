
-- ============================================================
-- Sales Workflow Full Migration
-- Adds missing columns for Odoo-like Devis → BC → BL → Facture
-- ============================================================

-- 1. QUOTATIONS: add validity_date, warehouse_id, sent_at, confirmed_at, cancel_reason, linked SO
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS validity_date date,
  ADD COLUMN IF NOT EXISTS warehouse_id uuid REFERENCES public.warehouses(id),
  ADD COLUMN IF NOT EXISTS sent_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS sales_order_id uuid;

-- 2. SALES ORDERS: add status_detail, cancel_reason, invoiced tracking, delivery_status
ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS invoiced_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS confirmed_by uuid,
  ADD COLUMN IF NOT EXISTS quotation_id uuid REFERENCES public.quotations(id),
  ADD COLUMN IF NOT EXISTS validity_date date,
  ADD COLUMN IF NOT EXISTS order_date date NOT NULL DEFAULT CURRENT_DATE;

-- 3. SALES ORDER LINES: delivered_qty already exists, but ensure it's there
ALTER TABLE public.sales_order_lines
  ADD COLUMN IF NOT EXISTS delivered_qty numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invoiced_qty numeric NOT NULL DEFAULT 0;

-- 4. DELIVERIES: add cancel_reason, cancelled_by, validated_at, validated_by, notes upgrade
ALTER TABLE public.deliveries
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS validated_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS validated_by uuid;

-- 5. INVOICES: add sales_order_id for smart links
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS sales_order_id uuid REFERENCES public.sales_orders(id);

-- 6. Update RLS: ensure sales users can insert/update quotations and sales_orders

-- Quotations policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quotations' AND policyname = 'Sales can insert quotations'
  ) THEN
    CREATE POLICY "Sales can insert quotations"
    ON public.quotations FOR INSERT
    WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'sales'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quotations' AND policyname = 'Sales can update quotations'
  ) THEN
    CREATE POLICY "Sales can update quotations"
    ON public.quotations FOR UPDATE
    USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'sales'::app_role));
  END IF;
END $$;

-- Sales orders policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sales_orders' AND policyname = 'Sales can insert sales orders'
  ) THEN
    CREATE POLICY "Sales can insert sales orders"
    ON public.sales_orders FOR INSERT
    WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'sales'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sales_orders' AND policyname = 'Sales can update sales orders'
  ) THEN
    CREATE POLICY "Sales can update sales orders"
    ON public.sales_orders FOR UPDATE
    USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'sales'::app_role));
  END IF;
END $$;

-- Quotation lines
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quotation_lines' AND policyname = 'Sales can insert quotation lines'
  ) THEN
    CREATE POLICY "Sales can insert quotation lines"
    ON public.quotation_lines FOR INSERT
    WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'sales'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quotation_lines' AND policyname = 'Sales can update quotation lines'
  ) THEN
    CREATE POLICY "Sales can update quotation lines"
    ON public.quotation_lines FOR UPDATE
    USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'sales'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'quotation_lines' AND policyname = 'Sales can delete quotation lines'
  ) THEN
    CREATE POLICY "Sales can delete quotation lines"
    ON public.quotation_lines FOR DELETE
    USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'sales'::app_role));
  END IF;
END $$;

-- Sales order lines
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sales_order_lines' AND policyname = 'Sales can insert order lines'
  ) THEN
    CREATE POLICY "Sales can insert order lines"
    ON public.sales_order_lines FOR INSERT
    WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'sales'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sales_order_lines' AND policyname = 'Sales can update order lines'
  ) THEN
    CREATE POLICY "Sales can update order lines"
    ON public.sales_order_lines FOR UPDATE
    USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'sales'::app_role));
  END IF;
END $$;
