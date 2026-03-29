-- Migration pour ajouter les mentions légales configurables
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS legal_mentions text;
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS legal_mentions text;

-- Commentaire pour documentation
COMMENT ON COLUMN public.companies.legal_mentions IS 'Mentions légales personnalisées affichées en bas des documents PDF';
