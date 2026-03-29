
CREATE TABLE public.reception_line_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reception_id uuid NOT NULL REFERENCES public.receptions(id) ON DELETE CASCADE,
  reception_line_id uuid NOT NULL REFERENCES public.reception_lines(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id),
  quantity numeric NOT NULL DEFAULT 0,
  company_id uuid REFERENCES public.companies(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reception_line_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company reception_line_allocations"
  ON public.reception_line_allocations
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT auth_user_company_ids()));

CREATE POLICY "Users can insert own company reception_line_allocations"
  ON public.reception_line_allocations
  FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT auth_user_company_ids()));

CREATE POLICY "Users can update own company reception_line_allocations"
  ON public.reception_line_allocations
  FOR UPDATE TO authenticated
  USING (company_id IN (SELECT auth_user_company_ids()))
  WITH CHECK (company_id IN (SELECT auth_user_company_ids()));

CREATE POLICY "Users can delete own company reception_line_allocations"
  ON public.reception_line_allocations
  FOR DELETE TO authenticated
  USING (company_id IN (SELECT auth_user_company_ids()));

CREATE POLICY "Admins can manage all reception_line_allocations"
  ON public.reception_line_allocations
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
