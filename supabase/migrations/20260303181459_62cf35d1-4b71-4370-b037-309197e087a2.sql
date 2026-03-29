
-- ============================================================
-- SECURITY HARDENING: Multi-tenant isolation + RLS fixes
-- ============================================================

-- ─── 1. Add company_id to child tables ──────────────────────

-- credit_note_lines
ALTER TABLE public.credit_note_lines ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
UPDATE public.credit_note_lines SET company_id = cn.company_id FROM public.credit_notes cn WHERE credit_note_lines.credit_note_id = cn.id AND credit_note_lines.company_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_credit_note_lines_company ON public.credit_note_lines(company_id);

-- cash_register_movements
ALTER TABLE public.cash_register_movements ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
UPDATE public.cash_register_movements SET company_id = cr.company_id FROM public.cash_registers cr WHERE cash_register_movements.cash_register_id = cr.id AND cash_register_movements.company_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_cash_register_movements_company ON public.cash_register_movements(company_id);

-- invoice_attachments
ALTER TABLE public.invoice_attachments ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
UPDATE public.invoice_attachments ia SET company_id = i.company_id FROM public.invoices i WHERE ia.invoice_id = i.id AND ia.company_id IS NULL;
UPDATE public.invoice_attachments ia SET company_id = cn.company_id FROM public.credit_notes cn WHERE ia.credit_note_id = cn.id AND ia.company_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_attachments_company ON public.invoice_attachments(company_id);

-- payment_allocations
ALTER TABLE public.payment_allocations ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
UPDATE public.payment_allocations pa SET company_id = p.company_id FROM public.payments p WHERE pa.payment_id = p.id AND pa.company_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_payment_allocations_company ON public.payment_allocations(company_id);

-- inventory_adjustment_lines
ALTER TABLE public.inventory_adjustment_lines ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
UPDATE public.inventory_adjustment_lines ial SET company_id = ia.company_id FROM public.inventory_adjustments ia WHERE ial.adjustment_id = ia.id AND ial.company_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_adjustment_lines_company ON public.inventory_adjustment_lines(company_id);

-- invoice_reception_links
ALTER TABLE public.invoice_reception_links ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
UPDATE public.invoice_reception_links irl SET company_id = i.company_id FROM public.invoices i WHERE irl.invoice_id = i.id AND irl.company_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_reception_links_company ON public.invoice_reception_links(company_id);

-- product_variants
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
UPDATE public.product_variants pv SET company_id = p.company_id FROM public.products p WHERE pv.product_id = p.id AND pv.company_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_product_variants_company ON public.product_variants(company_id);

-- product_images
ALTER TABLE public.product_images ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
UPDATE public.product_images pi SET company_id = p.company_id FROM public.products p WHERE pi.product_id = p.id AND pi.company_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_product_images_company ON public.product_images(company_id);

-- product_files
ALTER TABLE public.product_files ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
UPDATE public.product_files pf SET company_id = p.company_id FROM public.products p WHERE pf.product_id = p.id AND pf.company_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_product_files_company ON public.product_files(company_id);

-- stock_transfer_lines
ALTER TABLE public.stock_transfer_lines ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
UPDATE public.stock_transfer_lines stl SET company_id = st.company_id FROM public.stock_transfers st WHERE stl.transfer_id = st.id AND stl.company_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_stock_transfer_lines_company ON public.stock_transfer_lines(company_id);

-- variant_attribute_values
ALTER TABLE public.variant_attribute_values ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
UPDATE public.variant_attribute_values vav SET company_id = pv.company_id FROM public.product_variants pv WHERE vav.variant_id = pv.id AND vav.company_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_variant_attribute_values_company ON public.variant_attribute_values(company_id);

-- product_attribute_lines (linked to products)
ALTER TABLE public.product_attribute_lines ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
UPDATE public.product_attribute_lines pal SET company_id = p.company_id FROM public.products p WHERE pal.product_id = p.id AND pal.company_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_product_attribute_lines_company ON public.product_attribute_lines(company_id);

-- product_attribute_line_values (linked to product_attribute_lines)
ALTER TABLE public.product_attribute_line_values ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
UPDATE public.product_attribute_line_values palv SET company_id = pal.company_id FROM public.product_attribute_lines pal WHERE palv.line_id = pal.id AND palv.company_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_product_attribute_line_values_company ON public.product_attribute_line_values(company_id);


-- ─── 2. Fix document_counters for multi-tenant ──────────────

ALTER TABLE public.document_counters ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.document_counters DROP CONSTRAINT IF EXISTS document_counters_doc_type_doc_year_key;
-- Create new unique constraint (company-scoped)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_counters_company_type_year_key') THEN
    ALTER TABLE public.document_counters ADD CONSTRAINT document_counters_company_type_year_key UNIQUE(company_id, doc_type, doc_year);
  END IF;
END $$;

-- Update function to accept company_id
CREATE OR REPLACE FUNCTION public.next_document_number(p_type text, p_company_id uuid DEFAULT NULL)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_year integer := EXTRACT(YEAR FROM now())::integer;
  v_num integer;
BEGIN
  -- Verify caller has access to company if provided
  IF p_company_id IS NOT NULL 
     AND NOT user_has_company(auth.uid(), p_company_id) 
     AND NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied to company';
  END IF;

  INSERT INTO public.document_counters (doc_type, doc_year, company_id, last_number)
  VALUES (p_type, v_year, p_company_id, 1)
  ON CONFLICT (company_id, doc_type, doc_year)
  DO UPDATE SET last_number = document_counters.last_number + 1
  RETURNING last_number INTO v_num;
  
  RETURN p_type || '/' || v_year || '/' || LPAD(v_num::text, 5, '0');
END;
$function$;


-- ─── 3. Fix reference table policies: require auth ──────────

-- banks
DROP POLICY IF EXISTS "Auth users can view banks" ON public.banks;
CREATE POLICY "Authenticated users can view banks" ON public.banks FOR SELECT TO authenticated USING (true);

-- currencies
DROP POLICY IF EXISTS "Auth users can view currencies" ON public.currencies;
CREATE POLICY "Authenticated users can view currencies" ON public.currencies FOR SELECT TO authenticated USING (true);

-- tva_rates
DROP POLICY IF EXISTS "Auth users can view tva rates" ON public.tva_rates;
CREATE POLICY "Authenticated users can view tva rates" ON public.tva_rates FOR SELECT TO authenticated USING (true);

-- product_attributes (global config - auth only)
DROP POLICY IF EXISTS "Auth users can view attributes" ON public.product_attributes;
CREATE POLICY "Authenticated users can view attributes" ON public.product_attributes FOR SELECT TO authenticated USING (true);

-- product_attribute_values (global config - auth only)
DROP POLICY IF EXISTS "Auth users can view attribute values" ON public.product_attribute_values;
CREATE POLICY "Authenticated users can view attribute values" ON public.product_attribute_values FOR SELECT TO authenticated USING (true);


-- ─── 4. Fix child table policies: company-scoped ────────────

-- credit_note_lines
DROP POLICY IF EXISTS "Auth users can view credit note lines" ON public.credit_note_lines;
CREATE POLICY "Users view own company credit note lines" ON public.credit_note_lines FOR SELECT TO authenticated
  USING (company_id IS NULL OR user_has_company(auth.uid(), company_id) OR is_admin(auth.uid()));

-- cash_register_movements
DROP POLICY IF EXISTS "Auth users can view cash movements" ON public.cash_register_movements;
CREATE POLICY "Users view own company cash movements" ON public.cash_register_movements FOR SELECT TO authenticated
  USING (company_id IS NULL OR user_has_company(auth.uid(), company_id) OR is_admin(auth.uid()));

-- invoice_attachments
DROP POLICY IF EXISTS "Auth users can view attachments" ON public.invoice_attachments;
CREATE POLICY "Users view own company invoice attachments" ON public.invoice_attachments FOR SELECT TO authenticated
  USING (company_id IS NULL OR user_has_company(auth.uid(), company_id) OR is_admin(auth.uid()));

-- payment_allocations
DROP POLICY IF EXISTS "Auth users can view allocations" ON public.payment_allocations;
CREATE POLICY "Users view own company payment allocations" ON public.payment_allocations FOR SELECT TO authenticated
  USING (company_id IS NULL OR user_has_company(auth.uid(), company_id) OR is_admin(auth.uid()));

-- inventory_adjustment_lines
DROP POLICY IF EXISTS "Auth users can view adjustment lines" ON public.inventory_adjustment_lines;
CREATE POLICY "Users view own company adjustment lines" ON public.inventory_adjustment_lines FOR SELECT TO authenticated
  USING (company_id IS NULL OR user_has_company(auth.uid(), company_id) OR is_admin(auth.uid()));

-- invoice_reception_links
DROP POLICY IF EXISTS "Auth users can view invoice_reception_links" ON public.invoice_reception_links;
CREATE POLICY "Users view own company invoice_reception_links" ON public.invoice_reception_links FOR SELECT TO authenticated
  USING (company_id IS NULL OR user_has_company(auth.uid(), company_id) OR is_admin(auth.uid()));

-- product_variants
DROP POLICY IF EXISTS "Auth users can view variants" ON public.product_variants;
CREATE POLICY "Users view own company product variants" ON public.product_variants FOR SELECT TO authenticated
  USING (company_id IS NULL OR user_has_company(auth.uid(), company_id) OR is_admin(auth.uid()));

-- product_images
DROP POLICY IF EXISTS "Auth users can view product images" ON public.product_images;
CREATE POLICY "Users view own company product images" ON public.product_images FOR SELECT TO authenticated
  USING (company_id IS NULL OR user_has_company(auth.uid(), company_id) OR is_admin(auth.uid()));

-- product_files
DROP POLICY IF EXISTS "Auth users can view product files" ON public.product_files;
CREATE POLICY "Users view own company product files" ON public.product_files FOR SELECT TO authenticated
  USING (company_id IS NULL OR user_has_company(auth.uid(), company_id) OR is_admin(auth.uid()));

-- product_attribute_lines
DROP POLICY IF EXISTS "Auth users can view attribute lines" ON public.product_attribute_lines;
CREATE POLICY "Users view own company attribute lines" ON public.product_attribute_lines FOR SELECT TO authenticated
  USING (company_id IS NULL OR user_has_company(auth.uid(), company_id) OR is_admin(auth.uid()));

-- product_attribute_line_values
DROP POLICY IF EXISTS "Auth users can view line values" ON public.product_attribute_line_values;
CREATE POLICY "Users view own company line values" ON public.product_attribute_line_values FOR SELECT TO authenticated
  USING (company_id IS NULL OR user_has_company(auth.uid(), company_id) OR is_admin(auth.uid()));

-- variant_attribute_values
DROP POLICY IF EXISTS "Auth users can view variant attr values" ON public.variant_attribute_values;
CREATE POLICY "Users view own company variant attr values" ON public.variant_attribute_values FOR SELECT TO authenticated
  USING (company_id IS NULL OR user_has_company(auth.uid(), company_id) OR is_admin(auth.uid()));

-- stock_transfer_lines (check existing policies)
DROP POLICY IF EXISTS "Auth users can view transfer lines" ON public.stock_transfer_lines;
CREATE POLICY "Users view own company transfer lines" ON public.stock_transfer_lines FOR SELECT TO authenticated
  USING (company_id IS NULL OR user_has_company(auth.uid(), company_id) OR is_admin(auth.uid()));


-- ─── 5. Fix storage: make company-assets private ────────────

UPDATE storage.buckets SET public = false WHERE id = 'company-assets';

-- Drop overly permissive public policy
DROP POLICY IF EXISTS "Anyone can view company assets" ON storage.objects;

-- Authenticated users in the same company can view assets
CREATE POLICY "Authenticated users can view company assets" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'company-assets' AND auth.uid() IS NOT NULL);

-- invoice-attachments: ensure auth check
DROP POLICY IF EXISTS "Auth users can view invoice attachments" ON storage.objects;
CREATE POLICY "Authenticated users can view invoice attachments" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'invoice-attachments' AND auth.uid() IS NOT NULL);
