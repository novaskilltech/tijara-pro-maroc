
-- ============================================================
-- MIGRATION: MULTI-TENANT RLS ISOLATION (STABILIZATION)
-- ============================================================

-- This migration updates RLS policies for all business tables to strictly
-- isolate data by company_id and ensure users only see data from companies
-- they belong to.

-- 1. DROP OLD PERMISSIVE POLICIES
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON public.invoices;

-- 2. CREATE STRICT MULTI-TENANT POLICIES

-- PRODUCTS
CREATE POLICY "Users can only view products of their active company"
  ON public.products FOR SELECT
  USING (public.user_has_company(auth.uid(), company_id));

CREATE POLICY "Users can insert products into their companies"
  ON public.products FOR INSERT
  WITH CHECK (public.user_has_company(auth.uid(), company_id));

CREATE POLICY "Users can update products of their companies"
  ON public.products FOR UPDATE
  USING (public.user_has_company(auth.uid(), company_id));

CREATE POLICY "Users can delete products of their companies"
  ON public.products FOR DELETE
  USING (public.user_has_company(auth.uid(), company_id));


-- CUSTOMERS
CREATE POLICY "Users can only view customers of their active company"
  ON public.customers FOR SELECT
  USING (public.user_has_company(auth.uid(), company_id));

CREATE POLICY "Users can insert customers into their companies"
  ON public.customers FOR INSERT
  WITH CHECK (public.user_has_company(auth.uid(), company_id));

CREATE POLICY "Users can update customers of their companies"
  ON public.customers FOR UPDATE
  USING (public.user_has_company(auth.uid(), company_id));

-- SUPPLIERS
CREATE POLICY "Users can only view suppliers of their active company"
  ON public.suppliers FOR SELECT
  USING (public.user_has_company(auth.uid(), company_id));

CREATE POLICY "Users can insert suppliers into their companies"
  ON public.suppliers FOR INSERT
  WITH CHECK (public.user_has_company(auth.uid(), company_id));

-- INVOICES (And others)
-- Note: Applying similar logic to all tables that have company_id
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND column_name = 'company_id'
        AND table_name NOT IN ('products', 'customers', 'suppliers', 'audit_logs', 'companies')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can view %I" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Multi-tenant isolation for %I" ON public.%I FOR ALL USING (public.user_has_company(auth.uid(), company_id))', t, t);
    END LOOP;
END;
$$ LANGUAGE plpgsql;
