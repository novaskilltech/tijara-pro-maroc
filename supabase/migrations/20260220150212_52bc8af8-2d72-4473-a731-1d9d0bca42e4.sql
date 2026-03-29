
-- ── Expense categories ──────────────────────────────────────────────
CREATE TABLE public.expense_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  code        TEXT,
  color       TEXT DEFAULT '#6366f1',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view expense categories"
  ON public.expense_categories FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and accountants can manage expense categories"
  ON public.expense_categories FOR ALL
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'accountant'::app_role))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'accountant'::app_role));

-- ── Expenses ─────────────────────────────────────────────────────────
CREATE TABLE public.expenses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  expense_number   TEXT NOT NULL,
  expense_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier_id      UUID REFERENCES public.suppliers(id),
  category_id      UUID REFERENCES public.expense_categories(id),
  description      TEXT NOT NULL DEFAULT '',
  amount_ht        NUMERIC NOT NULL DEFAULT 0,
  tva_rate         NUMERIC NOT NULL DEFAULT 0,
  amount_tva       NUMERIC NOT NULL DEFAULT 0,
  amount_ttc       NUMERIC NOT NULL DEFAULT 0,
  payment_status   TEXT NOT NULL DEFAULT 'pending'
                   CHECK (payment_status IN ('pending', 'paid', 'cancelled')),
  payment_method   TEXT CHECK (payment_method IN ('cash', 'cheque', 'transfer', 'card', 'lcn')),
  payment_date     DATE,
  bank_account_id  UUID REFERENCES public.bank_accounts(id),
  notes            TEXT,
  created_by       UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view expenses"
  ON public.expenses FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and accountants can insert expenses"
  ON public.expenses FOR INSERT
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Admins and accountants can update expenses"
  ON public.expenses FOR UPDATE
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Only admins can delete expenses"
  ON public.expenses FOR DELETE
  USING (is_admin(auth.uid()));

-- ── Auto updated_at triggers ─────────────────────────────────────────
CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Default categories (global, no company) ──────────────────────────
INSERT INTO public.expense_categories (name, code, color, company_id) VALUES
  ('Loyer & Charges locatives',   'LOYER',    '#ef4444', NULL),
  ('Salaires & Charges sociales', 'SALAIRES', '#f97316', NULL),
  ('Fournitures de bureau',       'FOURNI',   '#eab308', NULL),
  ('Transport & Déplacements',    'TRANSPORT','#22c55e', NULL),
  ('Télécom & Internet',          'TELECOM',  '#06b6d4', NULL),
  ('Marketing & Publicité',       'MARKETING','#8b5cf6', NULL),
  ('Maintenance & Réparations',   'MAINT',    '#ec4899', NULL),
  ('Honoraires & Prestations',    'HONORAIRES','#64748b', NULL),
  ('Assurances',                  'ASSUR',    '#0ea5e9', NULL),
  ('Autres charges',              'AUTRES',   '#6b7280', NULL)
ON CONFLICT DO NOTHING;

-- ── Enable realtime ───────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
