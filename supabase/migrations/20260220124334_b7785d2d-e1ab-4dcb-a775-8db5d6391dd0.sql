
-- ============================================================
-- MULTI-COMPANY ARCHITECTURE MIGRATION
-- ============================================================

-- 1. Create companies table (extends company_settings concept)
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  raison_sociale TEXT NOT NULL DEFAULT '',
  forme_juridique TEXT DEFAULT 'SARL',
  ice TEXT DEFAULT '',
  if_number TEXT DEFAULT '',
  rc TEXT DEFAULT '',
  patente TEXT DEFAULT '',
  cnss TEXT DEFAULT '',
  capital NUMERIC DEFAULT 0,
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  postal_code TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  fax TEXT DEFAULT '',
  email TEXT DEFAULT '',
  website TEXT DEFAULT '',
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Create user_companies table (many-to-many: user <-> company)
CREATE TABLE IF NOT EXISTS public.user_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- 3. Add company_id to bank_accounts
ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- 4. Add company_id to all business tables
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.purchase_requests ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.receptions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.credit_notes ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.cash_registers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.inventory_adjustments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- 5. Enable RLS on new tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies for companies
CREATE POLICY "Authenticated users can view their companies"
  ON public.companies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.company_id = companies.id AND uc.user_id = auth.uid()
    )
    OR is_admin(auth.uid())
  );

CREATE POLICY "Super admins can manage companies"
  ON public.companies FOR ALL
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- 7. RLS policies for user_companies
CREATE POLICY "Users can view their own company memberships"
  ON public.user_companies FOR SELECT
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Super admins can manage user company memberships"
  ON public.user_companies FOR ALL
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- 8. Helper function: check if user belongs to company
CREATE OR REPLACE FUNCTION public.user_has_company(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_companies
    WHERE user_id = _user_id AND company_id = _company_id
  )
$$;

-- 9. Trigger to keep updated_at fresh on companies
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Migrate existing company_settings data into the new companies table
-- and create a default company from the existing company_settings row
INSERT INTO public.companies (
  id, raison_sociale, forme_juridique, ice, if_number, rc, patente, cnss,
  capital, address, city, postal_code, phone, fax, email, website, logo_url
)
SELECT
  gen_random_uuid(),
  COALESCE(raison_sociale, 'Ma Société'),
  COALESCE(forme_juridique, 'SARL'),
  COALESCE(ice, ''),
  COALESCE(if_number, ''),
  COALESCE(rc, ''),
  COALESCE(patente, ''),
  COALESCE(cnss, ''),
  COALESCE(capital, 0),
  COALESCE(address, ''),
  COALESCE(city, ''),
  COALESCE(postal_code, ''),
  COALESCE(phone, ''),
  COALESCE(fax, ''),
  COALESCE(email, ''),
  COALESCE(website, ''),
  logo_url
FROM public.company_settings
LIMIT 1
ON CONFLICT DO NOTHING;

-- 11. Assign all existing users to the default company
INSERT INTO public.user_companies (user_id, company_id, is_default)
SELECT 
  p.user_id,
  c.id,
  true
FROM public.profiles p
CROSS JOIN (SELECT id FROM public.companies LIMIT 1) c
ON CONFLICT (user_id, company_id) DO NOTHING;

-- 12. Update bank_accounts to link to default company
UPDATE public.bank_accounts
SET company_id = (SELECT id FROM public.companies LIMIT 1)
WHERE company_id IS NULL;

-- 13. Update all business tables to link to default company
UPDATE public.customers SET company_id = (SELECT id FROM public.companies LIMIT 1) WHERE company_id IS NULL;
UPDATE public.suppliers SET company_id = (SELECT id FROM public.companies LIMIT 1) WHERE company_id IS NULL;
UPDATE public.products SET company_id = (SELECT id FROM public.companies LIMIT 1) WHERE company_id IS NULL;
UPDATE public.invoices SET company_id = (SELECT id FROM public.companies LIMIT 1) WHERE company_id IS NULL;
UPDATE public.payments SET company_id = (SELECT id FROM public.companies LIMIT 1) WHERE company_id IS NULL;
UPDATE public.quotations SET company_id = (SELECT id FROM public.companies LIMIT 1) WHERE company_id IS NULL;
UPDATE public.purchase_orders SET company_id = (SELECT id FROM public.companies LIMIT 1) WHERE company_id IS NULL;
UPDATE public.purchase_requests SET company_id = (SELECT id FROM public.companies LIMIT 1) WHERE company_id IS NULL;
UPDATE public.deliveries SET company_id = (SELECT id FROM public.companies LIMIT 1) WHERE company_id IS NULL;
UPDATE public.receptions SET company_id = (SELECT id FROM public.companies LIMIT 1) WHERE company_id IS NULL;
UPDATE public.credit_notes SET company_id = (SELECT id FROM public.companies LIMIT 1) WHERE company_id IS NULL;
UPDATE public.cash_registers SET company_id = (SELECT id FROM public.companies LIMIT 1) WHERE company_id IS NULL;
UPDATE public.inventory_adjustments SET company_id = (SELECT id FROM public.companies LIMIT 1) WHERE company_id IS NULL;
UPDATE public.warehouses SET company_id = (SELECT id FROM public.companies LIMIT 1) WHERE company_id IS NULL;
