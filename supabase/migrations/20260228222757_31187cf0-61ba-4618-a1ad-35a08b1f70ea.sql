
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id),
  full_name TEXT NOT NULL,
  job_title TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  mobile TEXT DEFAULT '',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view contacts" ON public.contacts FOR SELECT USING (true);
CREATE POLICY "Admins and sales can insert contacts" ON public.contacts FOR INSERT WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'sales'::app_role));
CREATE POLICY "Admins and sales can update contacts" ON public.contacts FOR UPDATE USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'sales'::app_role));
CREATE POLICY "Only admins can delete contacts" ON public.contacts FOR DELETE USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'sales'::app_role));

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
