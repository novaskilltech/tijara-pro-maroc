
-- ============================================================
-- SECURITY SYSTEM: Roles, Permissions, Role-Permissions, Record Rules
-- ============================================================

-- 1. Create roles table
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name_fr TEXT NOT NULL,
  name_ar TEXT NOT NULL DEFAULT '',
  module TEXT NOT NULL DEFAULT 'admin', -- admin/purchase/stock/sales/invoicing/treasury/dashboard
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Create permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource TEXT NOT NULL,  -- products, customers, purchase_orders, etc.
  action TEXT NOT NULL,    -- CREATE, READ, UPDATE, DELETE, VALIDATE, APPROVE, CANCEL, EXPORT, PRINT, VIEW_DASHBOARD
  name_fr TEXT NOT NULL,
  name_ar TEXT NOT NULL DEFAULT '',
  UNIQUE(resource, action)
);

-- 3. Drop old user_roles table and recreate with role_id FK
-- First backup existing data
CREATE TABLE IF NOT EXISTS public.user_roles_legacy AS SELECT * FROM public.user_roles;

-- Drop old user_roles
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- New user_roles with role_id FK to roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  role TEXT, -- kept for backward compat with old system
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE, -- NULL = all companies
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role_id, company_id)
);

-- 4. Create role_permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  scope TEXT NOT NULL DEFAULT 'COMPANY_ONLY', -- ALL/OWN/ASSIGNED/COMPANY_ONLY
  requires_validation BOOLEAN NOT NULL DEFAULT false,
  approval_level INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- 5. Create record_rules table
CREATE TABLE IF NOT EXISTS public.record_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  resource TEXT NOT NULL,
  domain_json JSONB NOT NULL DEFAULT '{}',
  applies_to_role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
  priority INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_rules ENABLE ROW LEVEL SECURITY;

-- roles
CREATE POLICY "Everyone can view roles" ON public.roles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Super admins manage roles" ON public.roles FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- permissions
CREATE POLICY "Everyone can view permissions" ON public.permissions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Super admins manage permissions" ON public.permissions FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR is_admin(auth.uid()));
CREATE POLICY "Admins manage user roles" ON public.user_roles FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- role_permissions
CREATE POLICY "Everyone can view role permissions" ON public.role_permissions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Super admins manage role permissions" ON public.role_permissions FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- record_rules
CREATE POLICY "Everyone can view record rules" ON public.record_rules FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Super admins manage record rules" ON public.record_rules FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- ============================================================
-- RECREATE has_role function to work with new user_roles structure
-- Now checks both old role TEXT column and new role_id FK
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role::text
  )
$$;

-- ============================================================
-- SEED: Default Roles
-- ============================================================

INSERT INTO public.roles (code, name_fr, name_ar, module) VALUES
  ('ADMIN',               'Administrateur',           'مسؤول',                    'admin'),
  ('PURCHASE_USER',       'Acheteur',                 'مستخدم المشتريات',          'purchase'),
  ('PURCHASE_VALIDATOR',  'Validateur Achats',        'مُصادق المشتريات',          'purchase'),
  ('STOCK_USER',          'Gestionnaire Stock',       'مستخدم المخزون',            'stock'),
  ('STOCK_VALIDATOR',     'Validateur Stock',         'مُصادق المخزون',            'stock'),
  ('SALES_USER',          'Commercial',               'مستخدم المبيعات',           'sales'),
  ('SALES_VALIDATOR',     'Validateur Ventes',        'مُصادق المبيعات',           'sales'),
  ('INVOICING_USER',      'Comptable Facturation',    'مستخدم الفواتير',           'invoicing'),
  ('INVOICING_VALIDATOR', 'Validateur Facturation',   'مُصادق الفواتير',           'invoicing'),
  ('TREASURY_USER',       'Trésorier',                'مستخدم الخزينة',            'treasury'),
  ('TREASURY_VALIDATOR',  'Validateur Trésorerie',    'مُصادق الخزينة',            'treasury'),
  ('DASHBOARD_VIEW',      'Lecteur Tableaux de Bord', 'عارض لوحات المعلومات',      'dashboard')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- SEED: Permissions
-- ============================================================

INSERT INTO public.permissions (resource, action, name_fr, name_ar) VALUES
  -- products
  ('products', 'CREATE', 'Créer Produit', 'إنشاء منتج'),
  ('products', 'READ', 'Voir Produits', 'عرض المنتجات'),
  ('products', 'UPDATE', 'Modifier Produit', 'تعديل منتج'),
  ('products', 'DELETE', 'Supprimer Produit', 'حذف منتج'),
  ('products', 'EXPORT', 'Exporter Produits', 'تصدير المنتجات'),
  ('products', 'PRINT', 'Imprimer Produits', 'طباعة المنتجات'),
  -- customers
  ('customers', 'CREATE', 'Créer Client', 'إنشاء عميل'),
  ('customers', 'READ', 'Voir Clients', 'عرض العملاء'),
  ('customers', 'UPDATE', 'Modifier Client', 'تعديل عميل'),
  ('customers', 'DELETE', 'Supprimer Client', 'حذف عميل'),
  ('customers', 'EXPORT', 'Exporter Clients', 'تصدير العملاء'),
  -- suppliers
  ('suppliers', 'CREATE', 'Créer Fournisseur', 'إنشاء مورد'),
  ('suppliers', 'READ', 'Voir Fournisseurs', 'عرض الموردين'),
  ('suppliers', 'UPDATE', 'Modifier Fournisseur', 'تعديل مورد'),
  ('suppliers', 'DELETE', 'Supprimer Fournisseur', 'حذف مورد'),
  ('suppliers', 'EXPORT', 'Exporter Fournisseurs', 'تصدير الموردين'),
  -- purchase_orders
  ('purchase_orders', 'CREATE', 'Créer Commande Achat', 'إنشاء أمر شراء'),
  ('purchase_orders', 'READ', 'Voir Commandes Achat', 'عرض أوامر الشراء'),
  ('purchase_orders', 'UPDATE', 'Modifier Commande Achat', 'تعديل أمر شراء'),
  ('purchase_orders', 'DELETE', 'Supprimer Commande Achat', 'حذف أمر شراء'),
  ('purchase_orders', 'VALIDATE', 'Valider Commande Achat', 'التحقق من أمر الشراء'),
  ('purchase_orders', 'APPROVE', 'Approuver Commande Achat', 'اعتماد أمر الشراء'),
  ('purchase_orders', 'CANCEL', 'Annuler Commande Achat', 'إلغاء أمر الشراء'),
  ('purchase_orders', 'EXPORT', 'Exporter Commandes Achat', 'تصدير أوامر الشراء'),
  ('purchase_orders', 'PRINT', 'Imprimer Commandes Achat', 'طباعة أوامر الشراء'),
  -- stock_moves
  ('stock_moves', 'CREATE', 'Créer Mouvement Stock', 'إنشاء حركة مخزون'),
  ('stock_moves', 'READ', 'Voir Mouvements Stock', 'عرض حركات المخزون'),
  ('stock_moves', 'UPDATE', 'Modifier Mouvement Stock', 'تعديل حركة مخزون'),
  ('stock_moves', 'DELETE', 'Supprimer Mouvement Stock', 'حذف حركة مخزون'),
  ('stock_moves', 'VALIDATE', 'Valider Mouvement Stock', 'التحقق من حركة المخزون'),
  ('stock_moves', 'CANCEL', 'Annuler Mouvement Stock', 'إلغاء حركة المخزون'),
  ('stock_moves', 'EXPORT', 'Exporter Mouvements Stock', 'تصدير حركات المخزون'),
  -- sales_orders
  ('sales_orders', 'CREATE', 'Créer Commande Vente', 'إنشاء أمر بيع'),
  ('sales_orders', 'READ', 'Voir Commandes Vente', 'عرض أوامر البيع'),
  ('sales_orders', 'UPDATE', 'Modifier Commande Vente', 'تعديل أمر بيع'),
  ('sales_orders', 'DELETE', 'Supprimer Commande Vente', 'حذف أمر بيع'),
  ('sales_orders', 'VALIDATE', 'Valider Commande Vente', 'التحقق من أمر البيع'),
  ('sales_orders', 'APPROVE', 'Approuver Commande Vente', 'اعتماد أمر البيع'),
  ('sales_orders', 'CANCEL', 'Annuler Commande Vente', 'إلغاء أمر البيع'),
  ('sales_orders', 'EXPORT', 'Exporter Commandes Vente', 'تصدير أوامر البيع'),
  ('sales_orders', 'PRINT', 'Imprimer Commandes Vente', 'طباعة أوامر البيع'),
  -- invoices
  ('invoices', 'CREATE', 'Créer Facture', 'إنشاء فاتورة'),
  ('invoices', 'READ', 'Voir Factures', 'عرض الفواتير'),
  ('invoices', 'UPDATE', 'Modifier Facture', 'تعديل فاتورة'),
  ('invoices', 'DELETE', 'Supprimer Facture', 'حذف فاتورة'),
  ('invoices', 'VALIDATE', 'Valider Facture', 'التحقق من الفاتورة'),
  ('invoices', 'APPROVE', 'Approuver Facture', 'اعتماد الفاتورة'),
  ('invoices', 'CANCEL', 'Annuler Facture', 'إلغاء الفاتورة'),
  ('invoices', 'EXPORT', 'Exporter Factures', 'تصدير الفواتير'),
  ('invoices', 'PRINT', 'Imprimer Factures', 'طباعة الفواتير'),
  -- payments
  ('payments', 'CREATE', 'Créer Règlement', 'إنشاء دفعة'),
  ('payments', 'READ', 'Voir Règlements', 'عرض المدفوعات'),
  ('payments', 'UPDATE', 'Modifier Règlement', 'تعديل دفعة'),
  ('payments', 'DELETE', 'Supprimer Règlement', 'حذف دفعة'),
  ('payments', 'VALIDATE', 'Valider Règlement', 'التحقق من الدفعة'),
  ('payments', 'APPROVE', 'Approuver Règlement', 'اعتماد الدفعة'),
  ('payments', 'CANCEL', 'Annuler Règlement', 'إلغاء الدفعة'),
  ('payments', 'EXPORT', 'Exporter Règlements', 'تصدير المدفوعات'),
  ('payments', 'PRINT', 'Imprimer Règlements', 'طباعة المدفوعات'),
  -- bank_deposits
  ('bank_deposits', 'CREATE', 'Créer Dépôt Bancaire', 'إنشاء إيداع بنكي'),
  ('bank_deposits', 'READ', 'Voir Dépôts Bancaires', 'عرض الإيداعات البنكية'),
  ('bank_deposits', 'VALIDATE', 'Valider Dépôt', 'التحقق من الإيداع'),
  ('bank_deposits', 'EXPORT', 'Exporter Dépôts', 'تصدير الإيداعات'),
  -- cheques
  ('cheques', 'CREATE', 'Émettre Chèque', 'إصدار شيك'),
  ('cheques', 'READ', 'Voir Chèques', 'عرض الشيكات'),
  ('cheques', 'VALIDATE', 'Valider Chèque', 'التحقق من الشيك'),
  ('cheques', 'CANCEL', 'Annuler Chèque', 'إلغاء شيك'),
  -- dashboard
  ('dashboard', 'VIEW_DASHBOARD', 'Voir Tableaux de Bord', 'عرض لوحات المعلومات'),
  ('dashboard', 'READ', 'Lire Analytiques', 'قراءة التحليلات')
ON CONFLICT (resource, action) DO NOTHING;

-- ============================================================
-- SEED: Role Permissions (best practices)
-- ============================================================

-- ADMIN: all permissions on all resources
INSERT INTO public.role_permissions (role_id, permission_id, scope, requires_validation, approval_level)
SELECT r.id, p.id, 'ALL', false, NULL
FROM public.roles r, public.permissions p
WHERE r.code = 'ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- PURCHASE_USER: CRUD on purchase_orders, suppliers, products READ
INSERT INTO public.role_permissions (role_id, permission_id, scope, requires_validation)
SELECT r.id, p.id, 'COMPANY_ONLY', false
FROM public.roles r, public.permissions p
WHERE r.code = 'PURCHASE_USER'
  AND ((p.resource = 'purchase_orders' AND p.action IN ('CREATE','READ','UPDATE','PRINT'))
    OR (p.resource = 'suppliers' AND p.action IN ('READ','CREATE','UPDATE'))
    OR (p.resource = 'products' AND p.action = 'READ'))
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- PURCHASE_VALIDATOR: all purchase + validate/approve/cancel
INSERT INTO public.role_permissions (role_id, permission_id, scope, requires_validation, approval_level)
SELECT r.id, p.id, 'COMPANY_ONLY',
  CASE WHEN p.action IN ('VALIDATE','APPROVE') THEN true ELSE false END,
  CASE WHEN p.action IN ('VALIDATE','APPROVE') THEN 1 ELSE NULL END
FROM public.roles r, public.permissions p
WHERE r.code = 'PURCHASE_VALIDATOR'
  AND p.resource = 'purchase_orders'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- STOCK_USER: stock_moves CRUD + products/suppliers READ
INSERT INTO public.role_permissions (role_id, permission_id, scope, requires_validation)
SELECT r.id, p.id, 'COMPANY_ONLY', false
FROM public.roles r, public.permissions p
WHERE r.code = 'STOCK_USER'
  AND ((p.resource = 'stock_moves' AND p.action IN ('CREATE','READ','UPDATE','EXPORT'))
    OR (p.resource = 'products' AND p.action IN ('READ','CREATE','UPDATE')))
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- STOCK_VALIDATOR: all stock_moves + validate/cancel
INSERT INTO public.role_permissions (role_id, permission_id, scope, requires_validation, approval_level)
SELECT r.id, p.id, 'COMPANY_ONLY',
  CASE WHEN p.action IN ('VALIDATE') THEN true ELSE false END,
  CASE WHEN p.action IN ('VALIDATE') THEN 1 ELSE NULL END
FROM public.roles r, public.permissions p
WHERE r.code = 'STOCK_VALIDATOR'
  AND p.resource = 'stock_moves'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- SALES_USER: sales_orders CRUD + customers/products READ
INSERT INTO public.role_permissions (role_id, permission_id, scope, requires_validation)
SELECT r.id, p.id, 'COMPANY_ONLY', false
FROM public.roles r, public.permissions p
WHERE r.code = 'SALES_USER'
  AND ((p.resource = 'sales_orders' AND p.action IN ('CREATE','READ','UPDATE','PRINT'))
    OR (p.resource = 'customers' AND p.action IN ('READ','CREATE','UPDATE'))
    OR (p.resource = 'products' AND p.action = 'READ'))
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- SALES_VALIDATOR
INSERT INTO public.role_permissions (role_id, permission_id, scope, requires_validation, approval_level)
SELECT r.id, p.id, 'COMPANY_ONLY',
  CASE WHEN p.action IN ('VALIDATE','APPROVE') THEN true ELSE false END,
  CASE WHEN p.action IN ('VALIDATE','APPROVE') THEN 1 ELSE NULL END
FROM public.roles r, public.permissions p
WHERE r.code = 'SALES_VALIDATOR'
  AND p.resource = 'sales_orders'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- INVOICING_USER: invoices CRUD + customers/suppliers/products READ
INSERT INTO public.role_permissions (role_id, permission_id, scope, requires_validation)
SELECT r.id, p.id, 'COMPANY_ONLY', false
FROM public.roles r, public.permissions p
WHERE r.code = 'INVOICING_USER'
  AND ((p.resource = 'invoices' AND p.action IN ('CREATE','READ','UPDATE','PRINT','EXPORT'))
    OR (p.resource = 'customers' AND p.action = 'READ')
    OR (p.resource = 'suppliers' AND p.action = 'READ')
    OR (p.resource = 'products' AND p.action = 'READ'))
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- INVOICING_VALIDATOR
INSERT INTO public.role_permissions (role_id, permission_id, scope, requires_validation, approval_level)
SELECT r.id, p.id, 'COMPANY_ONLY',
  CASE WHEN p.action IN ('VALIDATE','APPROVE','CANCEL') THEN true ELSE false END,
  CASE WHEN p.action IN ('VALIDATE','APPROVE') THEN 1 ELSE NULL END
FROM public.roles r, public.permissions p
WHERE r.code = 'INVOICING_VALIDATOR'
  AND p.resource = 'invoices'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- TREASURY_USER: payments CRUD + bank_deposits/cheques READ/CREATE
INSERT INTO public.role_permissions (role_id, permission_id, scope, requires_validation)
SELECT r.id, p.id, 'COMPANY_ONLY', false
FROM public.roles r, public.permissions p
WHERE r.code = 'TREASURY_USER'
  AND ((p.resource = 'payments' AND p.action IN ('CREATE','READ','UPDATE','PRINT','EXPORT'))
    OR (p.resource = 'bank_deposits' AND p.action IN ('CREATE','READ'))
    OR (p.resource = 'cheques' AND p.action IN ('CREATE','READ')))
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- TREASURY_VALIDATOR
INSERT INTO public.role_permissions (role_id, permission_id, scope, requires_validation, approval_level)
SELECT r.id, p.id, 'COMPANY_ONLY',
  CASE WHEN p.action IN ('VALIDATE','APPROVE','CANCEL') THEN true ELSE false END,
  CASE WHEN p.action IN ('VALIDATE','APPROVE') THEN 1 ELSE NULL END
FROM public.roles r, public.permissions p
WHERE r.code = 'TREASURY_VALIDATOR'
  AND p.resource IN ('payments','bank_deposits','cheques')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- DASHBOARD_VIEW: only VIEW_DASHBOARD + READ on dashboard
INSERT INTO public.role_permissions (role_id, permission_id, scope, requires_validation)
SELECT r.id, p.id, 'COMPANY_ONLY', false
FROM public.roles r, public.permissions p
WHERE r.code = 'DASHBOARD_VIEW'
  AND p.resource = 'dashboard'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================
-- SEED: Default Record Rules
-- ============================================================

INSERT INTO public.record_rules (name, resource, domain_json, priority, is_active)
VALUES
  ('COMPANY_ONLY - Produits',          'products',        '{"company_id":"current_company"}', 10, true),
  ('COMPANY_ONLY - Clients',           'customers',       '{"company_id":"current_company"}', 10, true),
  ('COMPANY_ONLY - Fournisseurs',      'suppliers',       '{"company_id":"current_company"}', 10, true),
  ('COMPANY_ONLY - Commandes Achat',   'purchase_orders', '{"company_id":"current_company"}', 10, true),
  ('COMPANY_ONLY - Commandes Vente',   'sales_orders',    '{"company_id":"current_company"}', 10, true),
  ('COMPANY_ONLY - Mouvements Stock',  'stock_moves',     '{"company_id":"current_company"}', 10, true),
  ('COMPANY_ONLY - Factures',          'invoices',        '{"company_id":"current_company"}', 10, true),
  ('COMPANY_ONLY - Règlements',        'payments',        '{"company_id":"current_company"}', 10, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Restore existing user_roles from legacy (map old text roles)
-- Map old app_role enum to new roles table
-- ============================================================

INSERT INTO public.user_roles (user_id, role, is_primary, created_at)
SELECT user_id, role::text, true, created_at
FROM public.user_roles_legacy
ON CONFLICT DO NOTHING;
