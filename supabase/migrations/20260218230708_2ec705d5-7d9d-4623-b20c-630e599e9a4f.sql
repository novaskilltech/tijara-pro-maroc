
-- Document counters for auto-numbering (atomic per type per year)
CREATE TABLE public.document_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type text NOT NULL,
  doc_year integer NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  UNIQUE(doc_type, doc_year)
);
ALTER TABLE public.document_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read counters" ON public.document_counters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage counters" ON public.document_counters FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Function to get next document number atomically
CREATE OR REPLACE FUNCTION public.next_document_number(p_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year integer := EXTRACT(YEAR FROM now())::integer;
  v_num integer;
BEGIN
  INSERT INTO public.document_counters (doc_type, doc_year, last_number)
  VALUES (p_type, v_year, 1)
  ON CONFLICT (doc_type, doc_year)
  DO UPDATE SET last_number = document_counters.last_number + 1
  RETURNING last_number INTO v_num;
  
  RETURN p_type || '/' || v_year || '/' || LPAD(v_num::text, 5, '0');
END;
$$;

-- Invoices (both client and supplier)
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  invoice_type text NOT NULL CHECK (invoice_type IN ('client', 'supplier')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'cancelled', 'paid')),
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  customer_id uuid REFERENCES public.customers(id),
  supplier_id uuid REFERENCES public.suppliers(id),
  payment_terms text DEFAULT '30j',
  subtotal_ht numeric NOT NULL DEFAULT 0,
  total_tva numeric NOT NULL DEFAULT 0,
  total_ttc numeric NOT NULL DEFAULT 0,
  remaining_balance numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Auth users can view invoices" ON public.invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and accountants can insert invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'accountant'));
CREATE POLICY "Admins and accountants can update invoices" ON public.invoices FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'accountant'));
CREATE POLICY "Only admins can delete invoices" ON public.invoices FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- Invoice lines
CREATE TABLE public.invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  description text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  discount_percent numeric NOT NULL DEFAULT 0,
  tva_rate numeric NOT NULL DEFAULT 20,
  total_ht numeric NOT NULL DEFAULT 0,
  total_tva numeric NOT NULL DEFAULT 0,
  total_ttc numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view invoice lines" ON public.invoice_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and accountants can manage invoice lines" ON public.invoice_lines FOR ALL TO authenticated USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'accountant')) WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'accountant'));

-- Credit notes (avoirs)
CREATE TABLE public.credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_number text NOT NULL UNIQUE,
  credit_note_type text NOT NULL CHECK (credit_note_type IN ('client', 'supplier')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validated', 'cancelled')),
  credit_note_date date NOT NULL DEFAULT CURRENT_DATE,
  invoice_id uuid REFERENCES public.invoices(id),
  customer_id uuid REFERENCES public.customers(id),
  supplier_id uuid REFERENCES public.suppliers(id),
  reason text NOT NULL DEFAULT '',
  subtotal_ht numeric NOT NULL DEFAULT 0,
  total_tva numeric NOT NULL DEFAULT 0,
  total_ttc numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_credit_notes_updated_at BEFORE UPDATE ON public.credit_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Auth users can view credit notes" ON public.credit_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and accountants can insert credit notes" ON public.credit_notes FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'accountant'));
CREATE POLICY "Admins and accountants can update credit notes" ON public.credit_notes FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'accountant'));
CREATE POLICY "Only admins can delete credit notes" ON public.credit_notes FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- Credit note lines
CREATE TABLE public.credit_note_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id uuid NOT NULL REFERENCES public.credit_notes(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  description text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  tva_rate numeric NOT NULL DEFAULT 20,
  total_ht numeric NOT NULL DEFAULT 0,
  total_tva numeric NOT NULL DEFAULT 0,
  total_ttc numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.credit_note_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view credit note lines" ON public.credit_note_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and accountants can manage credit note lines" ON public.credit_note_lines FOR ALL TO authenticated USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'accountant')) WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'accountant'));

-- Invoice attachments
CREATE TABLE public.invoice_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE,
  credit_note_id uuid REFERENCES public.credit_notes(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  file_type text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view attachments" ON public.invoice_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and accountants can manage attachments" ON public.invoice_attachments FOR ALL TO authenticated USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'accountant')) WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'accountant'));

-- Storage bucket for invoice attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('invoice-attachments', 'invoice-attachments', false);

CREATE POLICY "Auth users can view invoice attachments" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'invoice-attachments');
CREATE POLICY "Admins and accountants can upload invoice attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'invoice-attachments' AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'accountant')));
CREATE POLICY "Admins can delete invoice attachments" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'invoice-attachments' AND public.is_admin(auth.uid()));
