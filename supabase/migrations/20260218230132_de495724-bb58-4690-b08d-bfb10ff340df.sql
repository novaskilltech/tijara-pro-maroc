
-- System settings table (single-row config)
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tva_rates jsonb NOT NULL DEFAULT '[7, 10, 14, 20]'::jsonb,
  default_tva numeric NOT NULL DEFAULT 20,
  default_currency text NOT NULL DEFAULT 'MAD',
  default_payment_terms text NOT NULL DEFAULT '30j',
  doc_numbering_format text NOT NULL DEFAULT 'TYPE/YEAR/0000X',
  allow_negative_stock boolean NOT NULL DEFAULT false,
  allow_admin_overrides boolean NOT NULL DEFAULT true,
  enable_attachments boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read settings
CREATE POLICY "Authenticated users can view system settings"
  ON public.system_settings FOR SELECT TO authenticated
  USING (true);

-- Only super_admin can modify
CREATE POLICY "Super admin can manage system settings"
  ON public.system_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default row
INSERT INTO public.system_settings (id) VALUES (gen_random_uuid());

-- Also add RLS policy: admins can manage roles (needed for user management)
-- super_admin can already manage via existing policies

-- Add policy for admins to toggle is_active on profiles
CREATE POLICY "Admins can manage profile activation"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
