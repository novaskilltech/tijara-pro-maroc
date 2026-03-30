
-- =====================================================
-- MULTI-TENANT ISOLATION: Indexes, Unique Constraints, Validation Triggers
-- =====================================================

-- 1) ADD MISSING INDEXES ON company_id
CREATE INDEX IF NOT EXISTS idx_bank_accounts_company ON public.bank_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_company ON public.bank_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_cash_registers_company ON public.cash_registers(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_company ON public.contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_company ON public.credit_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_company ON public.deliveries(company_id);
CREATE INDEX IF NOT EXISTS idx_delivery_lines_company ON public.delivery_lines(company_id);
CREATE INDEX IF NOT EXISTS idx_document_attachments_company ON public.document_attachments(company_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_company ON public.expense_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_company ON public.expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_company ON public.invoice_lines(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_company ON public.payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_terms_company ON public.payment_terms(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_company ON public.purchase_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_lines_company ON public.purchase_order_lines(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_company ON public.purchase_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_quotations_company ON public.quotations(company_id);
CREATE INDEX IF NOT EXISTS idx_quotation_lines_company ON public.quotation_lines(company_id);
CREATE INDEX IF NOT EXISTS idx_reception_lines_company ON public.reception_lines(company_id);
CREATE INDEX IF NOT EXISTS idx_receptions_company ON public.receptions(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_company ON public.sales_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_lines_company ON public.sales_order_lines(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_levels_company ON public.stock_levels(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_company ON public.stock_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfers_company ON public.stock_transfers(company_id);
-- CREATE INDEX IF NOT EXISTS idx_supplier_invoice_lines_company ON public.supplier_invoice_lines(company_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_company ON public.warehouses(company_id);

-- 2) FIX UNIQUE CONSTRAINTS TO BE COMPANY-SCOPED
-- Customers: code must be unique per company
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_code_key;
ALTER TABLE public.customers ADD CONSTRAINT customers_company_code_key UNIQUE (company_id, code);

-- Suppliers: code must be unique per company
ALTER TABLE public.suppliers DROP CONSTRAINT IF EXISTS suppliers_code_key;
ALTER TABLE public.suppliers ADD CONSTRAINT suppliers_company_code_key UNIQUE (company_id, code);

-- Products: code must be unique per company
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_code_key;
ALTER TABLE public.products ADD CONSTRAINT products_company_code_key UNIQUE (company_id, code);

-- Credit notes: number must be unique per company
ALTER TABLE public.credit_notes DROP CONSTRAINT IF EXISTS credit_notes_credit_note_number_key;
ALTER TABLE public.credit_notes ADD CONSTRAINT credit_notes_company_number_key UNIQUE (company_id, credit_note_number);

-- Warehouses: code must be unique per company
ALTER TABLE public.warehouses DROP CONSTRAINT IF EXISTS warehouses_code_key;
ALTER TABLE public.warehouses ADD CONSTRAINT warehouses_company_code_key UNIQUE (company_id, code);

-- 3) VALIDATION TRIGGERS: prevent cross-company references

-- Helper: validate that a referenced entity belongs to the same company
CREATE OR REPLACE FUNCTION public.validate_same_company_ref(
  _company_id uuid,
  _ref_table text,
  _ref_id uuid
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ref_company_id uuid;
BEGIN
  IF _ref_id IS NULL THEN RETURN true; END IF;
  IF _company_id IS NULL THEN RETURN true; END IF;
  
  EXECUTE format('SELECT company_id FROM public.%I WHERE id = $1', _ref_table)
    INTO _ref_company_id
    USING _ref_id;
  
  IF _ref_company_id IS NULL THEN RETURN true; END IF;
  RETURN _ref_company_id = _company_id;
END;
$$;

-- Trigger function for invoices: validate customer/supplier belong to same company
CREATE OR REPLACE FUNCTION public.trg_validate_invoice_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    IF NEW.customer_id IS NOT NULL AND NOT validate_same_company_ref(NEW.company_id, 'customers', NEW.customer_id) THEN
      RAISE EXCEPTION 'Ce client appartient à une autre société.';
    END IF;
    IF NEW.supplier_id IS NOT NULL AND NOT validate_same_company_ref(NEW.company_id, 'suppliers', NEW.supplier_id) THEN
      RAISE EXCEPTION 'Ce fournisseur appartient à une autre société.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoices_validate_company ON public.invoices;
CREATE TRIGGER trg_invoices_validate_company
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.trg_validate_invoice_company();

-- Trigger for quotations
CREATE OR REPLACE FUNCTION public.trg_validate_quotation_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    IF NEW.customer_id IS NOT NULL AND NOT validate_same_company_ref(NEW.company_id, 'customers', NEW.customer_id) THEN
      RAISE EXCEPTION 'Ce client appartient à une autre société.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_quotations_validate_company ON public.quotations;
CREATE TRIGGER trg_quotations_validate_company
  BEFORE INSERT OR UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.trg_validate_quotation_company();

-- Trigger for sales_orders
DROP TRIGGER IF EXISTS trg_sales_orders_validate_company ON public.sales_orders;
CREATE TRIGGER trg_sales_orders_validate_company
  BEFORE INSERT OR UPDATE ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_validate_quotation_company();

-- Trigger for deliveries
DROP TRIGGER IF EXISTS trg_deliveries_validate_company ON public.deliveries;
CREATE TRIGGER trg_deliveries_validate_company
  BEFORE INSERT OR UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.trg_validate_quotation_company();

-- Trigger for credit_notes
CREATE OR REPLACE FUNCTION public.trg_validate_credit_note_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    IF NEW.customer_id IS NOT NULL AND NOT validate_same_company_ref(NEW.company_id, 'customers', NEW.customer_id) THEN
      RAISE EXCEPTION 'Ce client appartient à une autre société.';
    END IF;
    IF NEW.supplier_id IS NOT NULL AND NOT validate_same_company_ref(NEW.company_id, 'suppliers', NEW.supplier_id) THEN
      RAISE EXCEPTION 'Ce fournisseur appartient à une autre société.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_credit_notes_validate_company ON public.credit_notes;
CREATE TRIGGER trg_credit_notes_validate_company
  BEFORE INSERT OR UPDATE ON public.credit_notes
  FOR EACH ROW EXECUTE FUNCTION public.trg_validate_credit_note_company();

-- Trigger for purchase_orders
CREATE OR REPLACE FUNCTION public.trg_validate_purchase_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    IF NEW.supplier_id IS NOT NULL AND NOT validate_same_company_ref(NEW.company_id, 'suppliers', NEW.supplier_id) THEN
      RAISE EXCEPTION 'Ce fournisseur appartient à une autre société.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_purchase_orders_validate_company ON public.purchase_orders;
CREATE TRIGGER trg_purchase_orders_validate_company
  BEFORE INSERT OR UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.trg_validate_purchase_company();

-- Trigger for purchase_requests
DROP TRIGGER IF EXISTS trg_purchase_requests_validate_company ON public.purchase_requests;
CREATE TRIGGER trg_purchase_requests_validate_company
  BEFORE INSERT OR UPDATE ON public.purchase_requests
  FOR EACH ROW EXECUTE FUNCTION public.trg_validate_purchase_company();

-- Trigger for receptions
DROP TRIGGER IF EXISTS trg_receptions_validate_company ON public.receptions;
CREATE TRIGGER trg_receptions_validate_company
  BEFORE INSERT OR UPDATE ON public.receptions
  FOR EACH ROW EXECUTE FUNCTION public.trg_validate_purchase_company();

-- Trigger for payments
CREATE OR REPLACE FUNCTION public.trg_validate_payment_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    IF NEW.customer_id IS NOT NULL AND NOT validate_same_company_ref(NEW.company_id, 'customers', NEW.customer_id) THEN
      RAISE EXCEPTION 'Ce client appartient à une autre société.';
    END IF;
    IF NEW.supplier_id IS NOT NULL AND NOT validate_same_company_ref(NEW.company_id, 'suppliers', NEW.supplier_id) THEN
      RAISE EXCEPTION 'Ce fournisseur appartient à une autre société.';
    END IF;
    IF NEW.bank_account_id IS NOT NULL AND NOT validate_same_company_ref(NEW.company_id, 'bank_accounts', NEW.bank_account_id) THEN
      RAISE EXCEPTION 'Ce compte bancaire appartient à une autre société.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payments_validate_company ON public.payments;
CREATE TRIGGER trg_payments_validate_company
  BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.trg_validate_payment_company();

-- Trigger for expenses
CREATE OR REPLACE FUNCTION public.trg_validate_expense_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    IF NEW.supplier_id IS NOT NULL AND NOT validate_same_company_ref(NEW.company_id, 'suppliers', NEW.supplier_id) THEN
      RAISE EXCEPTION 'Ce fournisseur appartient à une autre société.';
    END IF;
    IF NEW.bank_account_id IS NOT NULL AND NOT validate_same_company_ref(NEW.company_id, 'bank_accounts', NEW.bank_account_id) THEN
      RAISE EXCEPTION 'Ce compte bancaire appartient à une autre société.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_expenses_validate_company ON public.expenses;
CREATE TRIGGER trg_expenses_validate_company
  BEFORE INSERT OR UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.trg_validate_expense_company();
