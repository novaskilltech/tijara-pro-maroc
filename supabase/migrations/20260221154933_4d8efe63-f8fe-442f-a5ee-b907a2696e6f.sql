
-- ============================================
-- Payment Terms
-- ============================================
CREATE TABLE public.payment_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  days integer NOT NULL DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  company_id uuid REFERENCES public.companies(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view payment terms" ON public.payment_terms FOR SELECT USING (true);
CREATE POLICY "Admins can manage payment terms" ON public.payment_terms FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER update_payment_terms_updated_at BEFORE UPDATE ON public.payment_terms
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- TVA Rates (configurable)
-- ============================================
CREATE TABLE public.tva_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rate numeric NOT NULL DEFAULT 20,
  tva_type text NOT NULL DEFAULT 'both' CHECK (tva_type IN ('sale', 'purchase', 'both')),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tva_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view tva rates" ON public.tva_rates FOR SELECT USING (true);
CREATE POLICY "Admins can manage tva rates" ON public.tva_rates FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER update_tva_rates_updated_at BEFORE UPDATE ON public.tva_rates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Banks (reference list)
-- ============================================
CREATE TABLE public.banks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view banks" ON public.banks FOR SELECT USING (true);
CREATE POLICY "Admins can manage banks" ON public.banks FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER update_banks_updated_at BEFORE UPDATE ON public.banks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Currencies
-- ============================================
CREATE TABLE public.currencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE POLICY "Auth users can view currencies" ON public.currencies FOR SELECT USING (true);
CREATE POLICY "Admins can manage currencies" ON public.currencies FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER update_currencies_updated_at BEFORE UPDATE ON public.currencies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Seed data: Payment Terms
-- ============================================
INSERT INTO public.payment_terms (name, days, sort_order) VALUES
  ('Comptant', 0, 1),
  ('30 jours', 30, 2),
  ('60 jours', 60, 3),
  ('90 jours', 90, 4);

-- ============================================
-- Seed data: TVA Rates
-- ============================================
INSERT INTO public.tva_rates (name, rate, tva_type, sort_order) VALUES
  ('TVA 0%', 0, 'both', 1),
  ('TVA 7%', 7, 'both', 2),
  ('TVA 10%', 10, 'both', 3),
  ('TVA 14%', 14, 'both', 4),
  ('TVA 20%', 20, 'both', 5);

-- ============================================
-- Seed data: Moroccan Banks
-- ============================================
INSERT INTO public.banks (name, code, sort_order) VALUES
  ('Attijariwafa Bank', 'AWB', 1),
  ('BMCE Bank of Africa', 'BOA', 2),
  ('Banque Populaire', 'BP', 3),
  ('CIH Bank', 'CIH', 4),
  ('Crédit Agricole du Maroc', 'CAM', 5),
  ('Crédit du Maroc', 'CDM', 6),
  ('Société Générale Maroc', 'SGM', 7),
  ('BMCI', 'BMCI', 8),
  ('Bank Al-Maghrib', 'BAM', 9),
  ('CFG Bank', 'CFG', 10),
  ('Al Barid Bank', 'ABB', 11),
  ('Umnia Bank', 'UMN', 12),
  ('Bank Assafa', 'ASSAFA', 13),
  ('BTI Bank', 'BTI', 14);

-- ============================================
-- Seed data: Currencies
-- ============================================
INSERT INTO public.currencies (code, symbol, name, is_default, sort_order) VALUES
  ('MAD', 'MAD', 'Dirham marocain', true, 1),
  ('EUR', '€', 'Euro', false, 2),
  ('USD', '$', 'Dollar américain', false, 3),
  ('GBP', '£', 'Livre sterling', false, 4);
