
-- Table for UoM conversions (e.g., 1 Pack = 10 Unités)
CREATE TABLE public.uom_conversions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_unit_id uuid NOT NULL REFERENCES public.units_of_measure(id) ON DELETE CASCADE,
  to_unit_id uuid NOT NULL REFERENCES public.units_of_measure(id) ON DELETE CASCADE,
  factor numeric NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT uom_conversions_different_units CHECK (from_unit_id <> to_unit_id),
  CONSTRAINT uom_conversions_unique UNIQUE (from_unit_id, to_unit_id)
);

-- Enable RLS
ALTER TABLE public.uom_conversions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage uom conversions"
ON public.uom_conversions
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Auth users can view uom conversions"
ON public.uom_conversions
FOR SELECT
USING (true);

-- Updated_at trigger
CREATE TRIGGER update_uom_conversions_updated_at
BEFORE UPDATE ON public.uom_conversions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
