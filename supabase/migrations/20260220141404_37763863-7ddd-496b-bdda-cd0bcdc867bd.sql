
-- ============================================================
-- 1. PRODUCT CATEGORIES (up to 3 levels via self-referencing parent_id)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.product_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  code        TEXT,
  parent_id   UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  level       INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 3),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- index for tree traversal
CREATE INDEX IF NOT EXISTS idx_product_categories_parent ON public.product_categories(parent_id);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view categories"
  ON public.product_categories FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and stock managers can manage categories"
  ON public.product_categories FOR ALL
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'stock_manager'::app_role))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'stock_manager'::app_role));

-- auto-update updated_at
CREATE TRIGGER update_product_categories_updated_at
  BEFORE UPDATE ON public.product_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2. UNITS OF MEASURE (centrally managed)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.units_of_measure (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  symbol      TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'quantity', -- quantity, weight, volume, length, time
  is_active   BOOLEAN NOT NULL DEFAULT true,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.units_of_measure ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view units"
  ON public.units_of_measure FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage units"
  ON public.units_of_measure FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- ============================================================
-- 3. ADD category_id FK to products (keep existing category TEXT for fallback)
-- ============================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);

-- ============================================================
-- 4. SEED default units of measure
-- ============================================================
INSERT INTO public.units_of_measure (name, symbol, category, is_active, is_default, sort_order) VALUES
  -- Quantity
  ('Unité',      'U',    'quantity', true, true,  1),
  ('Paire',      'PR',   'quantity', true, false, 2),
  ('Douzaine',   'DZ',   'quantity', true, false, 3),
  ('Carton',     'CTN',  'quantity', true, false, 4),
  ('Palette',    'PAL',  'quantity', true, false, 5),
  -- Weight
  ('Kilogramme', 'kg',   'weight',   true, false, 10),
  ('Gramme',     'g',    'weight',   true, false, 11),
  ('Tonne',      'T',    'weight',   true, false, 12),
  -- Volume
  ('Litre',      'L',    'volume',   true, false, 20),
  ('Millilitre', 'mL',   'volume',   true, false, 21),
  -- Length
  ('Mètre',      'm',    'length',   true, false, 30),
  ('Centimètre', 'cm',   'length',   true, false, 31),
  -- Time
  ('Heure',      'h',    'time',     true, false, 40),
  ('Jour',       'j',    'time',     true, false, 41),
  ('Mois',       'mois', 'time',     true, false, 42)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. SEED default product categories (3-level example tree)
-- ============================================================
INSERT INTO public.product_categories (name, code, parent_id, level, sort_order) VALUES
  ('Matières premières',    'MAT',  NULL, 1, 1),
  ('Produits finis',        'PF',   NULL, 1, 2),
  ('Marchandises',          'MARCH',NULL, 1, 3),
  ('Services',              'SRV',  NULL, 1, 4),
  ('Emballages',            'EMB',  NULL, 1, 5)
ON CONFLICT DO NOTHING;
