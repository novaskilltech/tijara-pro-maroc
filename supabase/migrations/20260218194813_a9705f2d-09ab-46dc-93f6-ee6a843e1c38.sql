
-- Company settings (single row)
CREATE TABLE public.company_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  raison_sociale text NOT NULL DEFAULT '',
  forme_juridique text DEFAULT 'SARL',
  ice text DEFAULT '',
  if_number text DEFAULT '',
  rc text DEFAULT '',
  patente text DEFAULT '',
  cnss text DEFAULT '',
  capital numeric DEFAULT 0,
  address text DEFAULT '',
  city text DEFAULT '',
  postal_code text DEFAULT '',
  phone text DEFAULT '',
  fax text DEFAULT '',
  email text DEFAULT '',
  website text DEFAULT '',
  logo_url text,
  bank_name text DEFAULT '',
  bank_rib text DEFAULT '',
  bank_swift text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view company settings"
  ON public.company_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage company settings"
  ON public.company_settings FOR ALL
  USING (is_admin(auth.uid()));

CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default row
INSERT INTO public.company_settings (raison_sociale) VALUES ('');

-- Storage bucket for company logo
INSERT INTO storage.buckets (id, name, public) VALUES ('company-assets', 'company-assets', true);

CREATE POLICY "Anyone can view company assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'company-assets');

CREATE POLICY "Admins can upload company assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'company-assets' AND auth.uid() IS NOT NULL AND is_admin(auth.uid()));

CREATE POLICY "Admins can update company assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'company-assets' AND auth.uid() IS NOT NULL AND is_admin(auth.uid()));

CREATE POLICY "Admins can delete company assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'company-assets' AND auth.uid() IS NOT NULL AND is_admin(auth.uid()));
