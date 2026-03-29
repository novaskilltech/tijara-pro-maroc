
ALTER TABLE public.document_templates
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';

COMMENT ON COLUMN public.document_templates.status IS 'draft or published';
