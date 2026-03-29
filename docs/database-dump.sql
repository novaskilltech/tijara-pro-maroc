-- ============================================================
-- TIJARAPRO - COMPLETE DATABASE SCHEMA DUMP
-- Generated: 2026-03-04
-- ============================================================

-- ============================================================
-- CUSTOM TYPES
-- ============================================================
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'sales', 'accountant', 'stock_manager', 'purchase_manager');

-- ============================================================
-- FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.assign_default_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_has_super_admin boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'super_admin'
  ) INTO v_has_super_admin;
  IF NOT v_has_super_admin THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'sales');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.auth_user_company_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  select uc.company_id from public.user_companies uc where uc.user_id = auth.uid()
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, COALESCE(NEW.email, ''), COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role::text)
$function$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('super_admin', 'admin'))
$function$;

CREATE OR REPLACE FUNCTION public.user_has_company(_user_id uuid, _company_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_companies WHERE user_id = _user_id AND company_id = _company_id)
$function$;

CREATE OR REPLACE FUNCTION public.validate_same_company_ref(_company_id uuid, _ref_table text, _ref_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _ref_company_id uuid;
BEGIN
  IF _ref_id IS NULL THEN RETURN true; END IF;
  IF _company_id IS NULL THEN RETURN true; END IF;
  EXECUTE format('SELECT company_id FROM public.%I WHERE id = $1', _ref_table) INTO _ref_company_id USING _ref_id;
  IF _ref_company_id IS NULL THEN RETURN true; END IF;
  RETURN _ref_company_id = _company_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

-- next_document_number (simple version)
CREATE OR REPLACE FUNCTION public.next_document_number(p_type text)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_year integer := EXTRACT(YEAR FROM now())::integer; v_num integer;
BEGIN
  INSERT INTO public.document_counters (doc_type, doc_year, last_number) VALUES (p_type, v_year, 1)
  ON CONFLICT (doc_type, doc_year) DO UPDATE SET last_number = document_counters.last_number + 1
  RETURNING last_number INTO v_num;
  RETURN p_type || '/' || v_year || '/' || LPAD(v_num::text, 5, '0');
END;
$function$;

-- next_document_number (company-aware version)
CREATE OR REPLACE FUNCTION public.next_document_number(p_type text, p_company_id uuid DEFAULT NULL)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_year integer := EXTRACT(YEAR FROM now())::integer; v_num integer;
BEGIN
  IF p_company_id IS NOT NULL AND NOT user_has_company(auth.uid(), p_company_id) AND NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied to company';
  END IF;
  INSERT INTO public.document_counters (doc_type, doc_year, company_id, last_number) VALUES (p_type, v_year, p_company_id, 1)
  ON CONFLICT (company_id, doc_type, doc_year) DO UPDATE SET last_number = document_counters.last_number + 1
  RETURNING last_number INTO v_num;
  RETURN p_type || '/' || v_year || '/' || LPAD(v_num::text, 5, '0');
END;
$function$;

-- ============================================================
-- VALIDATION TRIGGER FUNCTIONS (multi-tenant integrity)
-- ============================================================

CREATE OR REPLACE FUNCTION public.trg_validate_invoice_company() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    IF NEW.customer_id IS NOT NULL AND NOT validate_same_company_ref(NEW.company_id, 'customers', NEW.customer_id) THEN RAISE EXCEPTION 'Ce client appartient à une autre société.'; END IF;
    IF NEW.supplier_id IS NOT NULL AND NOT validate_same_company_ref(NEW.company_id, 'suppliers', NEW.supplier_id) THEN RAISE EXCEPTION 'Ce fournisseur appartient à une autre société.'; END IF;
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.trg_validate_quotation_company() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    IF NEW.customer_id IS NOT NULL AND NOT validate_same_company_ref(NEW.company_id, 'customers', NEW.customer_id) THEN RAISE EXCEPTION 'Ce client appartient à une autre société.'; END IF;
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.trg_validate_purchase_company() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    IF NEW.supplier_id IS NOT NULL AND NOT validate_same_company_ref(NEW.company_id, 'suppliers', NEW.supplier_id) THEN RAISE EXCEPTION 'Ce fournisseur appartient à une autre société.'; END IF;
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.trg_validate_credit_note_company() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    IF NEW.customer_id IS NOT NULL AND NOT validate_same_company_ref(NEW.company_id, 'customers', NEW.customer_id) THEN RAISE EXCEPTION 'Ce client appartient à une autre société.'; END IF;
    IF NEW.supplier_id IS NOT NULL AND NOT validate_same_company_ref(NEW.company_id, 'suppliers', NEW.supplier_id) THEN RAISE EXCEPTION 'Ce fournisseur appartient à une autre société.'; END IF;
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.trg_validate_payment_company() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    IF NEW.customer_id IS NOT NULL AND NOT validate_same_company_ref(NEW.company_id, 'customers', NEW.customer_id) THEN RAISE EXCEPTION 'Ce client appartient à une autre société.'; END IF;
    IF NEW.supplier_id IS NOT NULL AND NOT validate_same_company_ref(NEW.company_id, 'suppliers', NEW.supplier_id) THEN RAISE EXCEPTION 'Ce fournisseur appartient à une autre société.'; END IF;
    IF NEW.bank_account_id IS NOT NULL AND NOT validate_same_company_ref(NEW.company_id, 'bank_accounts', NEW.bank_account_id) THEN RAISE EXCEPTION 'Ce compte bancaire appartient à une autre société.'; END IF;
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.trg_validate_expense_company() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    IF NEW.supplier_id IS NOT NULL AND NOT validate_same_company_ref(NEW.company_id, 'suppliers', NEW.supplier_id) THEN RAISE EXCEPTION 'Ce fournisseur appartient à une autre société.'; END IF;
    IF NEW.bank_account_id IS NOT NULL AND NOT validate_same_company_ref(NEW.company_id, 'bank_accounts', NEW.bank_account_id) THEN RAISE EXCEPTION 'Ce compte bancaire appartient à une autre société.'; END IF;
  END IF;
  RETURN NEW;
END; $function$;

-- ============================================================
-- TABLES (69 tables, ALL with RLS enabled)
-- ============================================================

-- ==================== audit_logs ====================
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  table_name text,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  details text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ==================== companies ====================
CREATE TABLE public.companies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  raison_sociale text NOT NULL DEFAULT '',
  forme_juridique text DEFAULT 'SARL',
  ice text DEFAULT '', if_number text DEFAULT '', rc text DEFAULT '', patente text DEFAULT '', cnss text DEFAULT '',
  capital numeric DEFAULT 0,
  address text DEFAULT '', city text DEFAULT '', postal_code text DEFAULT '',
  phone text DEFAULT '', fax text DEFAULT '', email text DEFAULT '', website text DEFAULT '',
  logo_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view their companies" ON public.companies FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_companies uc WHERE uc.company_id = companies.id AND uc.user_id = auth.uid()) OR is_admin(auth.uid()));
CREATE POLICY "Super admins can manage companies" ON public.companies FOR ALL
  USING (has_role(auth.uid(), 'super_admin')) WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- ==================== company_settings ====================
CREATE TABLE public.company_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  raison_sociale text NOT NULL DEFAULT '',
  forme_juridique text DEFAULT 'SARL',
  ice text DEFAULT '', if_number text DEFAULT '', rc text DEFAULT '', patente text DEFAULT '', cnss text DEFAULT '',
  capital numeric DEFAULT 0,
  address text DEFAULT '', city text DEFAULT '', postal_code text DEFAULT '',
  phone text DEFAULT '', fax text DEFAULT '', email text DEFAULT '', website text DEFAULT '',
  logo_url text,
  bank_name text DEFAULT '', bank_rib text DEFAULT '', bank_swift text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage company settings" ON public.company_settings FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Authenticated users can view company settings" ON public.company_settings FOR SELECT USING (auth.uid() IS NOT NULL);

-- ==================== profiles ====================
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  full_name text DEFAULT '',
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ==================== user_roles (legacy) ====================
CREATE TABLE public.user_roles_legacy (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles_legacy ENABLE ROW LEVEL SECURITY;

-- ==================== user_roles ====================
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ==================== user_companies ====================
CREATE TABLE public.user_companies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;

-- ==================== roles (RBAC) ====================
CREATE TABLE public.roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name_fr text NOT NULL DEFAULT '',
  name_ar text DEFAULT '',
  description text DEFAULT '',
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- ==================== permissions ====================
CREATE TABLE public.permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource text NOT NULL,
  action text NOT NULL,
  name_fr text NOT NULL,
  name_ar text NOT NULL DEFAULT '',
  UNIQUE(resource, action)
);
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view permissions" ON public.permissions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Super admins manage permissions" ON public.permissions FOR ALL USING (has_role(auth.uid(), 'super_admin')) WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- ==================== role_permissions ====================
CREATE TABLE public.role_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE(role_id, permission_id)
);
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- ==================== record_rules ====================
CREATE TABLE public.record_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  applies_to_role_id uuid REFERENCES roles(id) ON DELETE SET NULL
  -- other columns exist
);
ALTER TABLE public.record_rules ENABLE ROW LEVEL SECURITY;

-- ==================== customers ====================
CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL,
  name text NOT NULL,
  contact_name text, email text, phone text, phone2 text DEFAULT '', fax text,
  address text, city text,
  ice text, rc text, if_number text, patente text,
  payment_terms text DEFAULT '30j',
  credit_limit numeric DEFAULT 0,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  bank_name text DEFAULT '', rib text DEFAULT '', account_number text DEFAULT '', iban text DEFAULT '', swift text DEFAULT '',
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own company customers" ON public.customers FOR SELECT
  USING (company_id IS NULL OR user_has_company(auth.uid(), company_id) OR is_admin(auth.uid()));
CREATE POLICY "Admins and sales can insert customers" ON public.customers FOR INSERT
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'sales'));
CREATE POLICY "Admins and sales can update customers" ON public.customers FOR UPDATE
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'sales'));
CREATE POLICY "Only admins can delete customers" ON public.customers FOR DELETE
  USING (is_admin(auth.uid()));
-- Company-scoped policies
CREATE POLICY "customers_select_company" ON public.customers FOR SELECT USING (company_id IN (SELECT auth_user_company_ids()));
CREATE POLICY "customers_insert_company" ON public.customers FOR INSERT WITH CHECK (company_id IN (SELECT auth_user_company_ids()));
CREATE POLICY "customers_update_company" ON public.customers FOR UPDATE USING (company_id IN (SELECT auth_user_company_ids())) WITH CHECK (company_id IN (SELECT auth_user_company_ids()));
CREATE POLICY "customers_delete_company" ON public.customers FOR DELETE USING (company_id IN (SELECT auth_user_company_ids()));
CREATE INDEX idx_customers_company_id ON public.customers(company_id);
CREATE INDEX idx_customers_code ON public.customers(code);
CREATE INDEX idx_customers_name ON public.customers(name);

-- ==================== suppliers ====================
CREATE TABLE public.suppliers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL,
  name text NOT NULL,
  contact_name text, email text, phone text, phone2 text DEFAULT '', fax text,
  address text, city text,
  ice text, rc text, if_number text, patente text,
  payment_terms text DEFAULT '30j',
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  bank_name text DEFAULT '', rib text DEFAULT '', account_number text DEFAULT '', iban text DEFAULT '', swift text DEFAULT '',
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_suppliers_company_id ON public.suppliers(company_id);

-- ==================== contacts ====================
CREATE TABLE public.contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id),
  full_name text NOT NULL,
  job_title text DEFAULT '', email text DEFAULT '', phone text DEFAULT '', mobile text DEFAULT '',
  is_primary boolean NOT NULL DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_contacts_company ON public.contacts(company_id);

-- ==================== product_categories ====================
CREATE TABLE public.product_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  code text,
  parent_id uuid REFERENCES product_categories(id) ON DELETE SET NULL,
  level integer NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_product_categories_parent ON public.product_categories(parent_id);

-- ==================== products ====================
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  category text,
  category_id uuid REFERENCES product_categories(id) ON DELETE SET NULL,
  product_type text NOT NULL DEFAULT 'storable',
  purchase_price numeric NOT NULL DEFAULT 0,
  sale_price numeric NOT NULL DEFAULT 0,
  tva_rate numeric NOT NULL DEFAULT 20,
  min_stock numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  can_be_sold boolean NOT NULL DEFAULT true,
  can_be_purchased boolean NOT NULL DEFAULT true,
  image_url text,
  barcode text,
  weight numeric NOT NULL DEFAULT 0,
  unit_of_measure text DEFAULT 'Unité',
  uom_id uuid,
  purchase_uom_id uuid,
  internal_notes text,
  sale_description text,
  purchase_description text,
  accounting_account text,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_products_company_id ON public.products(company_id);
CREATE INDEX idx_products_code ON public.products(code);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_category_id ON public.products(category_id);

-- ==================== product_attributes ====================
CREATE TABLE public.product_attributes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  display_type text NOT NULL DEFAULT 'select',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_attributes ENABLE ROW LEVEL SECURITY;

-- ==================== product_attribute_values ====================
CREATE TABLE public.product_attribute_values (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attribute_id uuid NOT NULL REFERENCES product_attributes(id) ON DELETE CASCADE,
  value text NOT NULL,
  color_hex text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(attribute_id, value)
);
ALTER TABLE public.product_attribute_values ENABLE ROW LEVEL SECURITY;

-- ==================== product_attribute_lines ====================
CREATE TABLE public.product_attribute_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attribute_id uuid NOT NULL REFERENCES product_attributes(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, attribute_id)
);
ALTER TABLE public.product_attribute_lines ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_product_attribute_lines_company ON public.product_attribute_lines(company_id);

-- ==================== product_attribute_line_values ====================
CREATE TABLE public.product_attribute_line_values (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  line_id uuid NOT NULL REFERENCES product_attribute_lines(id) ON DELETE CASCADE,
  value_id uuid NOT NULL REFERENCES product_attribute_values(id) ON DELETE CASCADE,
  price_extra numeric NOT NULL DEFAULT 0,
  company_id uuid REFERENCES companies(id),
  UNIQUE(line_id, value_id)
);
ALTER TABLE public.product_attribute_line_values ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_product_attribute_line_values_company ON public.product_attribute_line_values(company_id);

-- ==================== product_variants ====================
CREATE TABLE public.product_variants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku text, barcode text, image_url text,
  sale_price numeric, purchase_price numeric,
  weight numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  company_id uuid REFERENCES companies(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_product_variants_company ON public.product_variants(company_id);

-- ==================== variant_attribute_values ====================
CREATE TABLE public.variant_attribute_values (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  variant_id uuid NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  attribute_value_id uuid NOT NULL REFERENCES product_attribute_values(id) ON DELETE CASCADE,
  UNIQUE(variant_id, attribute_value_id)
);
ALTER TABLE public.variant_attribute_values ENABLE ROW LEVEL SECURITY;

-- ==================== product_images ====================
CREATE TABLE public.product_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE SET NULL,
  image_url text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  company_id uuid REFERENCES companies(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_product_images_company ON public.product_images(company_id);

-- ==================== product_files ====================
CREATE TABLE public.product_files (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size integer,
  uploaded_by uuid,
  company_id uuid REFERENCES companies(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_files ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_product_files_company ON public.product_files(company_id);

-- ==================== warehouses ====================
CREATE TABLE public.warehouses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL,
  address text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_warehouses_company ON public.warehouses(company_id);

-- ==================== banks ====================
CREATE TABLE public.banks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  code text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage banks" ON public.banks FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Authenticated users can view banks" ON public.banks FOR SELECT USING (true);

-- ==================== currencies ====================
CREATE TABLE public.currencies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  symbol text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage currencies" ON public.currencies FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Authenticated users can view currencies" ON public.currencies FOR SELECT USING (true);

-- ==================== units_of_measure ====================
CREATE TABLE public.units_of_measure (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  symbol text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'unit',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.units_of_measure ENABLE ROW LEVEL SECURITY;

-- ==================== uom_conversions ====================
CREATE TABLE public.uom_conversions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_uom_id uuid NOT NULL REFERENCES units_of_measure(id) ON DELETE CASCADE,
  to_uom_id uuid NOT NULL REFERENCES units_of_measure(id) ON DELETE CASCADE,
  factor numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.uom_conversions ENABLE ROW LEVEL SECURITY;

-- ==================== tva_rates ====================
CREATE TABLE public.tva_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rate numeric NOT NULL,
  label text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tva_rates ENABLE ROW LEVEL SECURITY;

-- ==================== payment_terms ====================
CREATE TABLE public.payment_terms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  days integer NOT NULL DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  company_id uuid REFERENCES companies(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_terms ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_payment_terms_company ON public.payment_terms(company_id);

-- ==================== bank_accounts ====================
CREATE TABLE public.bank_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_name text NOT NULL,
  account_name text NOT NULL,
  account_number text, rib text, swift text,
  currency text NOT NULL DEFAULT 'MAD',
  initial_balance numeric NOT NULL DEFAULT 0,
  current_balance numeric NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_bank_accounts_company ON public.bank_accounts(company_id);

-- ==================== cash_registers ====================
CREATE TABLE public.cash_registers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL,
  warehouse_id uuid REFERENCES warehouses(id),
  assigned_user_id uuid,
  opening_balance numeric NOT NULL DEFAULT 0,
  current_balance numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, code),
  UNIQUE(company_id, name)
);
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_cash_registers_company ON public.cash_registers(company_id);

-- ==================== document_counters ====================
CREATE TABLE public.document_counters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_type text NOT NULL,
  doc_year integer NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  company_id uuid REFERENCES companies(id),
  UNIQUE(company_id, doc_type, doc_year)
);
ALTER TABLE public.document_counters ENABLE ROW LEVEL SECURITY;

-- ==================== document_templates ====================
CREATE TABLE public.document_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_type text NOT NULL,
  template_json jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'draft',
  version integer NOT NULL DEFAULT 1,
  updated_by uuid,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, document_type, version)
);
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

-- ==================== quotations ====================
CREATE TABLE public.quotations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_number text NOT NULL,
  quotation_date date NOT NULL DEFAULT CURRENT_DATE,
  validity_date date,
  customer_id uuid NOT NULL REFERENCES customers(id),
  status text NOT NULL DEFAULT 'draft',
  subtotal_ht numeric NOT NULL DEFAULT 0,
  total_tva numeric NOT NULL DEFAULT 0,
  total_ttc numeric NOT NULL DEFAULT 0,
  global_discount_type text NOT NULL DEFAULT 'percentage',
  global_discount_value numeric NOT NULL DEFAULT 0,
  global_discount_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  admin_validated_by uuid REFERENCES auth.users(id),
  admin_validated_at timestamptz,
  warehouse_id uuid REFERENCES warehouses(id),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_quotations_company ON public.quotations(company_id);

-- ==================== quotation_lines ====================
CREATE TABLE public.quotation_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id uuid NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  description text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  discount_percent numeric NOT NULL DEFAULT 0,
  tva_rate numeric NOT NULL DEFAULT 20,
  total_ht numeric NOT NULL DEFAULT 0,
  total_tva numeric NOT NULL DEFAULT 0,
  total_ttc numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quotation_lines ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_quotation_lines_company ON public.quotation_lines(company_id);

-- ==================== sales_orders ====================
CREATE TABLE public.sales_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number text NOT NULL,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  customer_id uuid NOT NULL REFERENCES customers(id),
  quotation_id uuid REFERENCES quotations(id),
  status text NOT NULL DEFAULT 'draft',
  subtotal_ht numeric NOT NULL DEFAULT 0,
  total_tva numeric NOT NULL DEFAULT 0,
  total_ttc numeric NOT NULL DEFAULT 0,
  global_discount_type text NOT NULL DEFAULT 'percentage',
  global_discount_value numeric NOT NULL DEFAULT 0,
  global_discount_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  admin_validated_by uuid REFERENCES auth.users(id),
  admin_validated_at timestamptz,
  warehouse_id uuid REFERENCES warehouses(id),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_sales_orders_company ON public.sales_orders(company_id);

-- ==================== sales_order_lines ====================
CREATE TABLE public.sales_order_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sales_order_id uuid NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
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
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_order_lines ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_sales_order_lines_company ON public.sales_order_lines(company_id);

-- ==================== deliveries ====================
CREATE TABLE public.deliveries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_number text NOT NULL,
  delivery_date date NOT NULL DEFAULT CURRENT_DATE,
  customer_id uuid NOT NULL REFERENCES customers(id),
  sales_order_id uuid REFERENCES sales_orders(id),
  invoice_id uuid REFERENCES invoices(id),
  warehouse_id uuid REFERENCES warehouses(id),
  status text NOT NULL DEFAULT 'draft',
  notes text,
  created_by uuid,
  validated_at timestamptz, validated_by uuid,
  cancelled_at timestamptz, cancelled_by uuid, cancel_reason text,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_deliveries_company ON public.deliveries(company_id);

-- ==================== delivery_lines ====================
CREATE TABLE public.delivery_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id uuid NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  sales_order_line_id uuid REFERENCES sales_order_lines(id),
  product_id uuid REFERENCES products(id),
  description text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  discount_percent numeric NOT NULL DEFAULT 0,
  tva_rate numeric NOT NULL DEFAULT 20,
  total_ht numeric NOT NULL DEFAULT 0,
  total_tva numeric NOT NULL DEFAULT 0,
  total_ttc numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_lines ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_delivery_lines_company ON public.delivery_lines(company_id);

-- ==================== purchase_requests ====================
CREATE TABLE public.purchase_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_number text NOT NULL,
  request_date date NOT NULL DEFAULT CURRENT_DATE,
  supplier_id uuid REFERENCES suppliers(id),
  warehouse_id uuid REFERENCES warehouses(id),
  currency_id uuid REFERENCES currencies(id),
  status text NOT NULL DEFAULT 'draft',
  priority text NOT NULL DEFAULT 'normal',
  notes text,
  requested_by uuid, approved_by uuid, refused_by uuid,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_purchase_requests_company ON public.purchase_requests(company_id);

-- ==================== purchase_request_lines ====================
CREATE TABLE public.purchase_request_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  description text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  tva_rate numeric NOT NULL DEFAULT 20,
  total_ht numeric NOT NULL DEFAULT 0,
  total_tva numeric NOT NULL DEFAULT 0,
  total_ttc numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  company_id uuid REFERENCES companies(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_request_lines ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_purchase_request_lines_company ON public.purchase_request_lines(company_id);

-- ==================== purchase_orders ====================
CREATE TABLE public.purchase_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number text NOT NULL,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  warehouse_id uuid REFERENCES warehouses(id),
  purchase_request_id uuid REFERENCES purchase_requests(id),
  request_id uuid REFERENCES purchase_requests(id),
  status text NOT NULL DEFAULT 'draft',
  subtotal_ht numeric NOT NULL DEFAULT 0,
  total_tva numeric NOT NULL DEFAULT 0,
  total_ttc numeric NOT NULL DEFAULT 0,
  global_discount_type text NOT NULL DEFAULT 'percentage',
  global_discount_value numeric NOT NULL DEFAULT 0,
  global_discount_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  admin_validated_by uuid REFERENCES auth.users(id),
  admin_validated_at timestamptz,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_purchase_orders_company ON public.purchase_orders(company_id);

-- ==================== purchase_order_lines ====================
CREATE TABLE public.purchase_order_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
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
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_order_lines ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_purchase_order_lines_company ON public.purchase_order_lines(company_id);

-- ==================== receptions ====================
CREATE TABLE public.receptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reception_number text NOT NULL,
  reception_date date NOT NULL DEFAULT CURRENT_DATE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  purchase_order_id uuid REFERENCES purchase_orders(id),
  warehouse_id uuid REFERENCES warehouses(id),
  invoice_id uuid REFERENCES invoices(id),
  status text NOT NULL DEFAULT 'draft',
  notes text,
  created_by uuid,
  validated_at timestamptz, validated_by uuid,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.receptions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_receptions_company ON public.receptions(company_id);

-- ==================== reception_lines ====================
CREATE TABLE public.reception_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reception_id uuid NOT NULL REFERENCES receptions(id) ON DELETE CASCADE,
  purchase_order_line_id uuid REFERENCES purchase_order_lines(id),
  product_id uuid REFERENCES products(id),
  description text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  tva_rate numeric NOT NULL DEFAULT 20,
  total_ht numeric NOT NULL DEFAULT 0,
  total_tva numeric NOT NULL DEFAULT 0,
  total_ttc numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reception_lines ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_reception_lines_company ON public.reception_lines(company_id);

-- ==================== invoices ====================
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number text NOT NULL,
  invoice_type text NOT NULL,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  customer_id uuid REFERENCES customers(id),
  supplier_id uuid REFERENCES suppliers(id),
  sales_order_id uuid REFERENCES sales_orders(id),
  purchase_order_id uuid REFERENCES purchase_orders(id),
  reception_id uuid REFERENCES receptions(id),
  status text NOT NULL DEFAULT 'draft',
  subtotal_ht numeric NOT NULL DEFAULT 0,
  total_tva numeric NOT NULL DEFAULT 0,
  total_ttc numeric NOT NULL DEFAULT 0,
  remaining_balance numeric NOT NULL DEFAULT 0,
  global_discount_type text NOT NULL DEFAULT 'percentage',
  global_discount_value numeric NOT NULL DEFAULT 0,
  global_discount_amount numeric NOT NULL DEFAULT 0,
  payment_terms text DEFAULT '30j',
  notes text,
  cancel_reason text,
  created_by uuid,
  admin_validated_by uuid REFERENCES auth.users(id),
  admin_validated_at timestamptz,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, invoice_number)
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_invoices_company_id ON public.invoices(company_id);
-- RLS policies
CREATE POLICY "Users view own company invoices" ON public.invoices FOR SELECT
  USING (company_id IS NULL OR user_has_company(auth.uid(), company_id) OR is_admin(auth.uid()));
CREATE POLICY "Admins and accountants can insert invoices" ON public.invoices FOR INSERT
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'accountant'));
CREATE POLICY "Admins and accountants can update invoices" ON public.invoices FOR UPDATE
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'accountant'));
CREATE POLICY "Only admins can delete invoices" ON public.invoices FOR DELETE USING (is_admin(auth.uid()));
-- Company-scoped policies
CREATE POLICY "invoices_select_company" ON public.invoices FOR SELECT USING (company_id IN (SELECT auth_user_company_ids()));
CREATE POLICY "invoices_insert_company" ON public.invoices FOR INSERT WITH CHECK (company_id IN (SELECT auth_user_company_ids()));
CREATE POLICY "invoices_update_company" ON public.invoices FOR UPDATE USING (company_id IN (SELECT auth_user_company_ids())) WITH CHECK (company_id IN (SELECT auth_user_company_ids()));
CREATE POLICY "invoices_delete_company" ON public.invoices FOR DELETE USING (company_id IN (SELECT auth_user_company_ids()));

-- ==================== invoice_lines ====================
CREATE TABLE public.invoice_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  description text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  discount_percent numeric NOT NULL DEFAULT 0,
  tva_rate numeric NOT NULL DEFAULT 20,
  total_ht numeric NOT NULL DEFAULT 0,
  total_tva numeric NOT NULL DEFAULT 0,
  total_ttc numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_invoice_lines_company ON public.invoice_lines(company_id);

-- ==================== invoice_attachments ====================
CREATE TABLE public.invoice_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  credit_note_id uuid REFERENCES credit_notes(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text, file_size integer,
  uploaded_by uuid,
  company_id uuid REFERENCES companies(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_attachments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_invoice_attachments_company ON public.invoice_attachments(company_id);

-- ==================== invoice_reception_links ====================
CREATE TABLE public.invoice_reception_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  reception_id uuid NOT NULL REFERENCES receptions(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(invoice_id, reception_id)
);
ALTER TABLE public.invoice_reception_links ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_invoice_reception_links_company ON public.invoice_reception_links(company_id);

-- ==================== credit_notes ====================
CREATE TABLE public.credit_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_note_number text NOT NULL,
  credit_note_type text NOT NULL,
  credit_note_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'draft',
  invoice_id uuid REFERENCES invoices(id),
  customer_id uuid REFERENCES customers(id),
  supplier_id uuid REFERENCES suppliers(id),
  reason text NOT NULL DEFAULT '',
  subtotal_ht numeric NOT NULL DEFAULT 0,
  total_tva numeric NOT NULL DEFAULT 0,
  total_ttc numeric NOT NULL DEFAULT 0,
  created_by uuid,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, credit_note_number)
);
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_credit_notes_company ON public.credit_notes(company_id);

-- ==================== credit_note_lines ====================
CREATE TABLE public.credit_note_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_note_id uuid NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  description text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  tva_rate numeric NOT NULL DEFAULT 20,
  total_ht numeric NOT NULL DEFAULT 0,
  total_tva numeric NOT NULL DEFAULT 0,
  total_ttc numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  company_id uuid REFERENCES companies(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.credit_note_lines ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_credit_note_lines_company ON public.credit_note_lines(company_id);

-- ==================== payments ====================
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_number text NOT NULL,
  payment_type text NOT NULL,
  payment_method text NOT NULL DEFAULT 'transfer',
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL DEFAULT 0,
  customer_id uuid REFERENCES customers(id),
  supplier_id uuid REFERENCES suppliers(id),
  bank_account_id uuid REFERENCES bank_accounts(id),
  reference text, notes text,
  cheque_number text, cheque_bank text, cheque_date date,
  lcn_due_date date,
  is_override boolean NOT NULL DEFAULT false,
  override_reason text,
  created_by uuid,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_payments_company ON public.payments(company_id);

-- ==================== payment_allocations ====================
CREATE TABLE public.payment_allocations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id),
  amount numeric NOT NULL DEFAULT 0,
  company_id uuid REFERENCES companies(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_payment_allocations_company ON public.payment_allocations(company_id);

-- ==================== expenses ====================
CREATE TABLE public.expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_number text NOT NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL DEFAULT '',
  supplier_id uuid REFERENCES suppliers(id),
  category_id uuid REFERENCES expense_categories(id),
  bank_account_id uuid REFERENCES bank_accounts(id),
  amount_ht numeric NOT NULL DEFAULT 0,
  tva_rate numeric NOT NULL DEFAULT 0,
  amount_tva numeric NOT NULL DEFAULT 0,
  amount_ttc numeric NOT NULL DEFAULT 0,
  payment_method text, payment_date date,
  payment_status text NOT NULL DEFAULT 'pending',
  notes text,
  created_by uuid,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_expenses_company ON public.expenses(company_id);

-- ==================== expense_categories ====================
CREATE TABLE public.expense_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  code text,
  color text DEFAULT '#6366f1',
  is_active boolean NOT NULL DEFAULT true,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_expense_categories_company ON public.expense_categories(company_id);

-- ==================== bank_transactions ====================
CREATE TABLE public.bank_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_account_id uuid NOT NULL REFERENCES bank_accounts(id),
  transaction_date date NOT NULL,
  description text NOT NULL DEFAULT '',
  reference text,
  debit numeric NOT NULL DEFAULT 0,
  credit numeric NOT NULL DEFAULT 0,
  is_reconciled boolean NOT NULL DEFAULT false,
  reconciled_payment_id uuid REFERENCES payments(id),
  reconciled_by uuid, reconciled_at timestamptz,
  imported_at timestamptz NOT NULL DEFAULT now(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_bank_transactions_company ON public.bank_transactions(company_id);

-- ==================== cash_register_movements ====================
CREATE TABLE public.cash_register_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cash_register_id uuid NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
  movement_type text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  reference text, notes text,
  payment_id uuid REFERENCES payments(id),
  created_by uuid,
  company_id uuid REFERENCES companies(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cash_register_movements ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_cash_register_movements_company ON public.cash_register_movements(company_id);

-- ==================== stock_levels ====================
CREATE TABLE public.stock_levels (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES products(id),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  quantity numeric NOT NULL DEFAULT 0,
  reserved_qty numeric NOT NULL DEFAULT 0,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, warehouse_id)
);
ALTER TABLE public.stock_levels ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_stock_levels_company ON public.stock_levels(company_id);

-- ==================== stock_movements ====================
CREATE TABLE public.stock_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES products(id),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  movement_type text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  reference_type text, reference_id uuid,
  notes text,
  created_by uuid,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_stock_movements_company ON public.stock_movements(company_id);

-- ==================== stock_transfers ====================
CREATE TABLE public.stock_transfers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transfer_number text NOT NULL,
  transfer_date date NOT NULL DEFAULT CURRENT_DATE,
  from_warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  to_warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  status text NOT NULL DEFAULT 'draft',
  notes text,
  created_by uuid,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_stock_transfers_company ON public.stock_transfers(company_id);

-- ==================== stock_transfer_lines ====================
CREATE TABLE public.stock_transfer_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transfer_id uuid NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  quantity numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_transfer_lines ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_stock_transfer_lines_company ON public.stock_transfer_lines(company_id);

-- ==================== inventory_adjustments ====================
CREATE TABLE public.inventory_adjustments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  adjustment_number text NOT NULL,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id),
  status text NOT NULL DEFAULT 'draft',
  notes text,
  created_by uuid, validated_by uuid,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;

-- ==================== inventory_adjustment_lines ====================
CREATE TABLE public.inventory_adjustment_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  adjustment_id uuid NOT NULL REFERENCES inventory_adjustments(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id),
  system_qty numeric NOT NULL DEFAULT 0,
  counted_qty numeric NOT NULL DEFAULT 0,
  difference numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  company_id uuid REFERENCES companies(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_adjustment_lines ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_inventory_adjustment_lines_company ON public.inventory_adjustment_lines(company_id);

-- ==================== document_attachments ====================
CREATE TABLE public.document_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doc_id uuid NOT NULL,
  doc_type text NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text, file_size integer,
  is_audio boolean NOT NULL DEFAULT false,
  uploaded_by uuid REFERENCES auth.users(id),
  company_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.document_attachments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_document_attachments_company ON public.document_attachments(company_id);

-- ==================== supplier_invoice_lines (legacy/unused) ====================
CREATE TABLE public.supplier_invoice_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY
  -- Legacy table - invoices use unified invoice_lines table
);
ALTER TABLE public.supplier_invoice_lines ENABLE ROW LEVEL SECURITY;

-- ==================== reminder_logs ====================
CREATE TABLE public.reminder_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid REFERENCES invoices(id),
  customer_id uuid REFERENCES customers(id),
  -- other columns
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;

-- ==================== system_settings ====================
CREATE TABLE public.system_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL,
  value text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- updated_at triggers
CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_banks_updated_at BEFORE UPDATE ON public.banks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cash_registers_updated_at BEFORE UPDATE ON public.cash_registers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON public.company_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_credit_notes_updated_at BEFORE UPDATE ON public.credit_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_currencies_updated_at BEFORE UPDATE ON public.currencies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deliveries_updated_at BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_document_templates_updated_at BEFORE UPDATE ON public.document_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expense_categories_updated_at BEFORE UPDATE ON public.expense_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_adjustments_updated_at BEFORE UPDATE ON public.inventory_adjustments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_terms_updated_at BEFORE UPDATE ON public.payment_terms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_categories_updated_at BEFORE UPDATE ON public.product_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_requests_updated_at BEFORE UPDATE ON public.purchase_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_receptions_updated_at BEFORE UPDATE ON public.receptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_orders_updated_at BEFORE UPDATE ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stock_transfers_updated_at BEFORE UPDATE ON public.stock_transfers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Company validation triggers (multi-tenant integrity)
CREATE TRIGGER trg_invoices_validate_company BEFORE INSERT OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION trg_validate_invoice_company();
CREATE TRIGGER trg_credit_notes_validate_company BEFORE INSERT OR UPDATE ON public.credit_notes FOR EACH ROW EXECUTE FUNCTION trg_validate_credit_note_company();
CREATE TRIGGER trg_purchase_orders_validate_company BEFORE INSERT OR UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION trg_validate_purchase_company();
CREATE TRIGGER trg_purchase_requests_validate_company BEFORE INSERT OR UPDATE ON public.purchase_requests FOR EACH ROW EXECUTE FUNCTION trg_validate_purchase_company();
CREATE TRIGGER trg_quotations_validate_company BEFORE INSERT OR UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION trg_validate_quotation_company();
CREATE TRIGGER trg_sales_orders_validate_company BEFORE INSERT OR UPDATE ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION trg_validate_quotation_company();
CREATE TRIGGER trg_deliveries_validate_company BEFORE INSERT OR UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION trg_validate_quotation_company();
CREATE TRIGGER trg_payments_validate_company BEFORE INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION trg_validate_payment_company();
CREATE TRIGGER trg_expenses_validate_company BEFORE INSERT OR UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION trg_validate_expense_company();
CREATE TRIGGER trg_receptions_validate_company BEFORE INSERT OR UPDATE ON public.receptions FOR EACH ROW EXECUTE FUNCTION trg_validate_purchase_company();

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
-- invoice-attachments (private)
-- document-attachments (private)
-- company-assets (private, path-based RLS: company_id/...)

-- ============================================================
-- END OF DUMP
-- ============================================================
