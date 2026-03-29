
-- Add new fields to products table
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'stockable',
  ADD COLUMN IF NOT EXISTS can_be_sold boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_be_purchased boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS purchase_unit text NOT NULL DEFAULT 'Unité',
  ADD COLUMN IF NOT EXISTS weight numeric NOT NULL DEFAULT 0;

-- Product Attributes (e.g., Taille, Couleur)
CREATE TABLE public.product_attributes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  display_type text NOT NULL DEFAULT 'dropdown', -- dropdown, radio, color
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_attributes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view attributes" ON public.product_attributes FOR SELECT USING (true);
CREATE POLICY "Admins and stock managers can manage attributes" ON public.product_attributes FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'stock_manager'::app_role));

-- Attribute Values (e.g., S, M, L, Rouge, Bleu)
CREATE TABLE public.product_attribute_values (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attribute_id uuid NOT NULL REFERENCES public.product_attributes(id) ON DELETE CASCADE,
  value text NOT NULL,
  color_hex text, -- for color swatches
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(attribute_id, value)
);
ALTER TABLE public.product_attribute_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view attribute values" ON public.product_attribute_values FOR SELECT USING (true);
CREATE POLICY "Admins and stock managers can manage attribute values" ON public.product_attribute_values FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'stock_manager'::app_role));

-- Link products to attributes (which attributes does this product use?)
CREATE TABLE public.product_attribute_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  attribute_id uuid NOT NULL REFERENCES public.product_attributes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, attribute_id)
);
ALTER TABLE public.product_attribute_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view attribute lines" ON public.product_attribute_lines FOR SELECT USING (true);
CREATE POLICY "Admins and stock managers can manage attribute lines" ON public.product_attribute_lines FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'stock_manager'::app_role));

-- Which values are selected for a product's attribute line
CREATE TABLE public.product_attribute_line_values (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  line_id uuid NOT NULL REFERENCES public.product_attribute_lines(id) ON DELETE CASCADE,
  value_id uuid NOT NULL REFERENCES public.product_attribute_values(id) ON DELETE CASCADE,
  price_extra numeric NOT NULL DEFAULT 0,
  UNIQUE(line_id, value_id)
);
ALTER TABLE public.product_attribute_line_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view line values" ON public.product_attribute_line_values FOR SELECT USING (true);
CREATE POLICY "Admins and stock managers can manage line values" ON public.product_attribute_line_values FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'stock_manager'::app_role));

-- Product Variants
CREATE TABLE public.product_variants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku text,
  barcode text,
  sale_price numeric, -- NULL = inherit from parent
  purchase_price numeric,
  weight numeric NOT NULL DEFAULT 0,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view variants" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "Admins and stock managers can manage variants" ON public.product_variants FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'stock_manager'::app_role));

CREATE TRIGGER update_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link variants to their attribute values
CREATE TABLE public.variant_attribute_values (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  attribute_id uuid NOT NULL REFERENCES public.product_attributes(id) ON DELETE CASCADE,
  value_id uuid NOT NULL REFERENCES public.product_attribute_values(id) ON DELETE CASCADE,
  UNIQUE(variant_id, attribute_id)
);
ALTER TABLE public.variant_attribute_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view variant attr values" ON public.variant_attribute_values FOR SELECT USING (true);
CREATE POLICY "Admins and stock managers can manage variant attr values" ON public.variant_attribute_values FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'stock_manager'::app_role));

-- Product Images (multiple per product)
CREATE TABLE public.product_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  image_url text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view product images" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Admins and stock managers can manage product images" ON public.product_images FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'stock_manager'::app_role));

-- Product Files (attachments)
CREATE TABLE public.product_files (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size integer,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view product files" ON public.product_files FOR SELECT USING (true);
CREATE POLICY "Admins and stock managers can manage product files" ON public.product_files FOR ALL USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'stock_manager'::app_role));
