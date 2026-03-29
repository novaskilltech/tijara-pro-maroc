
-- =====================================================
-- STOCK ENGINE TABLES
-- =====================================================

-- Stock levels per product per warehouse
CREATE TABLE public.stock_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  stock_on_hand numeric NOT NULL DEFAULT 0,
  stock_reserved numeric NOT NULL DEFAULT 0,
  cmup numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, warehouse_id)
);

-- Stock movements
CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id),
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id),
  movement_type text NOT NULL, -- 'in', 'out', 'transfer_in', 'transfer_out', 'adjustment'
  quantity numeric NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  reference_type text, -- 'delivery', 'reception', 'adjustment', 'transfer', 'manual'
  reference_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Stock transfers
CREATE TABLE public.stock_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number text NOT NULL,
  from_warehouse_id uuid NOT NULL REFERENCES public.warehouses(id),
  to_warehouse_id uuid NOT NULL REFERENCES public.warehouses(id),
  status text NOT NULL DEFAULT 'draft', -- draft, validated, cancelled
  notes text,
  created_by uuid,
  validated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.stock_transfer_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id uuid NOT NULL REFERENCES public.stock_transfers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Inventory adjustments
CREATE TABLE public.inventory_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_number text NOT NULL,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id),
  status text NOT NULL DEFAULT 'draft',
  notes text,
  created_by uuid,
  validated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.inventory_adjustment_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_id uuid NOT NULL REFERENCES public.inventory_adjustments(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  system_qty numeric NOT NULL DEFAULT 0,
  counted_qty numeric NOT NULL DEFAULT 0,
  difference numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- SALES MODULE TABLES
-- =====================================================

CREATE TABLE public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number text NOT NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  quotation_date date NOT NULL DEFAULT CURRENT_DATE,
  validity_date date,
  status text NOT NULL DEFAULT 'draft',
  subtotal_ht numeric NOT NULL DEFAULT 0,
  total_tva numeric NOT NULL DEFAULT 0,
  total_ttc numeric NOT NULL DEFAULT 0,
  notes text,
  payment_terms text DEFAULT '30j',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quotation_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  description text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  discount_percent numeric NOT NULL DEFAULT 0,
  tva_rate numeric NOT NULL DEFAULT 20,
  total_ht numeric NOT NULL DEFAULT 0,
  total_tva numeric NOT NULL DEFAULT 0,
  total_ttc numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL,
  quotation_id uuid REFERENCES public.quotations(id),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'draft',
  subtotal_ht numeric NOT NULL DEFAULT 0,
  total_tva numeric NOT NULL DEFAULT 0,
  total_ttc numeric NOT NULL DEFAULT 0,
  notes text,
  payment_terms text DEFAULT '30j',
  warehouse_id uuid REFERENCES public.warehouses(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sales_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  description text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 1,
  delivered_qty numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  discount_percent numeric NOT NULL DEFAULT 0,
  tva_rate numeric NOT NULL DEFAULT 20,
  total_ht numeric NOT NULL DEFAULT 0,
  total_tva numeric NOT NULL DEFAULT 0,
  total_ttc numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_number text NOT NULL,
  sales_order_id uuid REFERENCES public.sales_orders(id),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  delivery_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'draft',
  warehouse_id uuid REFERENCES public.warehouses(id),
  invoice_id uuid REFERENCES public.invoices(id),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.delivery_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  sales_order_line_id uuid REFERENCES public.sales_order_lines(id),
  product_id uuid REFERENCES public.products(id),
  description text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  discount_percent numeric NOT NULL DEFAULT 0,
  tva_rate numeric NOT NULL DEFAULT 20,
  total_ht numeric NOT NULL DEFAULT 0,
  total_tva numeric NOT NULL DEFAULT 0,
  total_ttc numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- PURCHASE MODULE TABLES
-- =====================================================

CREATE TABLE public.purchase_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  requested_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.purchase_request_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.purchase_requests(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  description text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL,
  request_id uuid REFERENCES public.purchase_requests(id),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'draft',
  subtotal_ht numeric NOT NULL DEFAULT 0,
  total_tva numeric NOT NULL DEFAULT 0,
  total_ttc numeric NOT NULL DEFAULT 0,
  notes text,
  payment_terms text DEFAULT '30j',
  warehouse_id uuid REFERENCES public.warehouses(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.purchase_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  description text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 1,
  received_qty numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  discount_percent numeric NOT NULL DEFAULT 0,
  tva_rate numeric NOT NULL DEFAULT 20,
  total_ht numeric NOT NULL DEFAULT 0,
  total_tva numeric NOT NULL DEFAULT 0,
  total_ttc numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.receptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reception_number text NOT NULL,
  purchase_order_id uuid REFERENCES public.purchase_orders(id),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
  reception_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'draft',
  warehouse_id uuid REFERENCES public.warehouses(id),
  invoice_id uuid REFERENCES public.invoices(id),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.reception_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reception_id uuid NOT NULL REFERENCES public.receptions(id) ON DELETE CASCADE,
  purchase_order_line_id uuid REFERENCES public.purchase_order_lines(id),
  product_id uuid REFERENCES public.products(id),
  description text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  discount_percent numeric NOT NULL DEFAULT 0,
  tva_rate numeric NOT NULL DEFAULT 20,
  total_ht numeric NOT NULL DEFAULT 0,
  total_tva numeric NOT NULL DEFAULT 0,
  total_ttc numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- CASH REGISTERS
-- =====================================================

CREATE TABLE public.cash_registers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  warehouse_id uuid REFERENCES public.warehouses(id),
  assigned_user_id uuid,
  opening_balance numeric NOT NULL DEFAULT 0,
  current_balance numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cash_register_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id uuid NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
  movement_type text NOT NULL, -- 'in', 'out', 'opening', 'closing'
  amount numeric NOT NULL DEFAULT 0,
  reference text,
  payment_id uuid REFERENCES public.payments(id),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Stock levels
ALTER TABLE public.stock_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view stock levels" ON public.stock_levels FOR SELECT USING (true);
CREATE POLICY "Admins and stock managers can manage stock levels" ON public.stock_levels FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'stock_manager'));

-- Stock movements
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view stock movements" ON public.stock_movements FOR SELECT USING (true);
CREATE POLICY "Admins and stock managers can insert stock movements" ON public.stock_movements FOR INSERT WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'stock_manager'));

-- Stock transfers
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view transfers" ON public.stock_transfers FOR SELECT USING (true);
CREATE POLICY "Stock managers can manage transfers" ON public.stock_transfers FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'stock_manager'));

ALTER TABLE public.stock_transfer_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view transfer lines" ON public.stock_transfer_lines FOR SELECT USING (true);
CREATE POLICY "Stock managers can manage transfer lines" ON public.stock_transfer_lines FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'stock_manager'));

-- Inventory adjustments
ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view adjustments" ON public.inventory_adjustments FOR SELECT USING (true);
CREATE POLICY "Stock managers can manage adjustments" ON public.inventory_adjustments FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'stock_manager'));

ALTER TABLE public.inventory_adjustment_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view adjustment lines" ON public.inventory_adjustment_lines FOR SELECT USING (true);
CREATE POLICY "Stock managers can manage adjustment lines" ON public.inventory_adjustment_lines FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'stock_manager'));

-- Quotations
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view quotations" ON public.quotations FOR SELECT USING (true);
CREATE POLICY "Sales can manage quotations" ON public.quotations FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'sales'));

ALTER TABLE public.quotation_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view quotation lines" ON public.quotation_lines FOR SELECT USING (true);
CREATE POLICY "Sales can manage quotation lines" ON public.quotation_lines FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'sales'));

-- Sales orders
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view sales orders" ON public.sales_orders FOR SELECT USING (true);
CREATE POLICY "Sales can manage sales orders" ON public.sales_orders FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'sales'));

ALTER TABLE public.sales_order_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view sales order lines" ON public.sales_order_lines FOR SELECT USING (true);
CREATE POLICY "Sales can manage sales order lines" ON public.sales_order_lines FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'sales'));

-- Deliveries
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view deliveries" ON public.deliveries FOR SELECT USING (true);
CREATE POLICY "Sales and stock can manage deliveries" ON public.deliveries FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'sales') OR has_role(auth.uid(), 'stock_manager'));

ALTER TABLE public.delivery_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view delivery lines" ON public.delivery_lines FOR SELECT USING (true);
CREATE POLICY "Sales and stock can manage delivery lines" ON public.delivery_lines FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'sales') OR has_role(auth.uid(), 'stock_manager'));

-- Purchase requests
ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view purchase requests" ON public.purchase_requests FOR SELECT USING (true);
CREATE POLICY "Admins and accountants can manage purchase requests" ON public.purchase_requests FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'accountant'));

ALTER TABLE public.purchase_request_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view purchase request lines" ON public.purchase_request_lines FOR SELECT USING (true);
CREATE POLICY "Admins and accountants can manage purchase request lines" ON public.purchase_request_lines FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'accountant'));

-- Purchase orders
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view purchase orders" ON public.purchase_orders FOR SELECT USING (true);
CREATE POLICY "Admins and accountants can manage purchase orders" ON public.purchase_orders FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'accountant'));

ALTER TABLE public.purchase_order_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view purchase order lines" ON public.purchase_order_lines FOR SELECT USING (true);
CREATE POLICY "Admins and accountants can manage purchase order lines" ON public.purchase_order_lines FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'accountant'));

-- Receptions
ALTER TABLE public.receptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view receptions" ON public.receptions FOR SELECT USING (true);
CREATE POLICY "Admins accountants stock can manage receptions" ON public.receptions FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'accountant') OR has_role(auth.uid(), 'stock_manager'));

ALTER TABLE public.reception_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view reception lines" ON public.reception_lines FOR SELECT USING (true);
CREATE POLICY "Admins accountants stock can manage reception lines" ON public.reception_lines FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'accountant') OR has_role(auth.uid(), 'stock_manager'));

-- Cash registers
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view cash registers" ON public.cash_registers FOR SELECT USING (true);
CREATE POLICY "Admins and accountants can manage cash registers" ON public.cash_registers FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'accountant'));

ALTER TABLE public.cash_register_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view cash movements" ON public.cash_register_movements FOR SELECT USING (true);
CREATE POLICY "Admins and accountants can manage cash movements" ON public.cash_register_movements FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'accountant'));

-- Updated_at triggers
CREATE TRIGGER update_stock_transfers_updated_at BEFORE UPDATE ON public.stock_transfers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_adjustments_updated_at BEFORE UPDATE ON public.inventory_adjustments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_orders_updated_at BEFORE UPDATE ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deliveries_updated_at BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_requests_updated_at BEFORE UPDATE ON public.purchase_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_receptions_updated_at BEFORE UPDATE ON public.receptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cash_registers_updated_at BEFORE UPDATE ON public.cash_registers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
