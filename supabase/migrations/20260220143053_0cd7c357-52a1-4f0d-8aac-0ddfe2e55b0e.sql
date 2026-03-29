
-- ============================================================
-- 1. Generic document_attachments table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.document_attachments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type      text NOT NULL,  -- 'quotation' | 'sales_order' | 'delivery' | 'purchase_order' | 'purchase_request' | 'reception' | 'invoice' | 'credit_note'
  doc_id        uuid NOT NULL,
  file_name     text NOT NULL,
  file_url      text NOT NULL,
  file_size     integer,
  file_type     text,           -- MIME type, 'audio/webm' for voice notes
  is_audio      boolean NOT NULL DEFAULT false,
  uploaded_by   uuid REFERENCES auth.users(id),
  company_id    uuid,
  created_at    timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_attachments ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view attachments of their company
CREATE POLICY "Auth users can view doc attachments"
  ON public.document_attachments FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Admins, accountants, sales, stock managers can manage attachments
CREATE POLICY "Staff can insert doc attachments"
  ON public.document_attachments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can delete own doc attachments"
  ON public.document_attachments FOR DELETE
  USING (
    is_admin(auth.uid())
    OR uploaded_by = auth.uid()
  );

-- ============================================================
-- 2. Add require_double_validation to system_settings
-- ============================================================
ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS require_double_validation boolean NOT NULL DEFAULT false;

-- ============================================================
-- 3. Add admin validation tracking columns to core doc tables
-- ============================================================
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS admin_validated_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS admin_validated_by uuid REFERENCES auth.users(id);

ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS admin_validated_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS admin_validated_by uuid REFERENCES auth.users(id);

ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS admin_validated_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS admin_validated_by uuid REFERENCES auth.users(id);

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS admin_validated_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS admin_validated_by uuid REFERENCES auth.users(id);

-- ============================================================
-- 4. Storage bucket for general doc attachments
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('document-attachments', 'document-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can upload
CREATE POLICY "Auth users can upload doc attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'document-attachments'
    AND auth.uid() IS NOT NULL
  );

-- Storage RLS: authenticated users can read
CREATE POLICY "Auth users can read doc attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'document-attachments'
    AND auth.uid() IS NOT NULL
  );

-- Storage RLS: admins and uploaders can delete
CREATE POLICY "Admins and owners can delete doc attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'document-attachments'
    AND (is_admin(auth.uid()) OR (storage.foldername(name))[1] = auth.uid()::text)
  );
