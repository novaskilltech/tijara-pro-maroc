
-- Create variant_attribute_values junction table (links variants to their attribute+value combos)
CREATE TABLE IF NOT EXISTS public.variant_attribute_values (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  attribute_id uuid NOT NULL REFERENCES public.product_attributes(id) ON DELETE CASCADE,
  value_id uuid NOT NULL REFERENCES public.product_attribute_values(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(variant_id, attribute_id)
);

-- Enable RLS
ALTER TABLE public.variant_attribute_values ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users view own company variant_attribute_values"
  ON public.variant_attribute_values FOR SELECT
  USING (company_id IS NULL OR user_has_company(auth.uid(), company_id) OR is_admin(auth.uid()));

CREATE POLICY "Admins and accountants can manage variant_attribute_values"
  ON public.variant_attribute_values FOR ALL
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'accountant'::app_role))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'accountant'::app_role));

-- Add unique constraints for upserts on existing tables (if not already present)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_attribute_lines_product_id_attribute_id_key') THEN
    ALTER TABLE public.product_attribute_lines ADD CONSTRAINT product_attribute_lines_product_id_attribute_id_key UNIQUE(product_id, attribute_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'product_attribute_line_values_line_id_value_id_key') THEN
    ALTER TABLE public.product_attribute_line_values ADD CONSTRAINT product_attribute_line_values_line_id_value_id_key UNIQUE(line_id, value_id);
  END IF;
END $$;
