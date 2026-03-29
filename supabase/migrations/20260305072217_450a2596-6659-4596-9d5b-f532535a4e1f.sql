
-- 1. Add company_id column to reminder_logs
ALTER TABLE public.reminder_logs
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS reminder_logs_company_id_idx ON public.reminder_logs(company_id);

-- 3. Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Auth users can view reminder logs" ON public.reminder_logs;

-- 4. Add company-scoped RLS policies
CREATE POLICY "Users view own company reminder logs"
  ON public.reminder_logs FOR SELECT TO authenticated
  USING (user_has_company(auth.uid(), company_id) OR is_admin(auth.uid()));

CREATE POLICY "Users insert own company reminder logs"
  ON public.reminder_logs FOR INSERT TO authenticated
  WITH CHECK (user_has_company(auth.uid(), company_id) OR is_admin(auth.uid()));

CREATE POLICY "Users update own company reminder logs"
  ON public.reminder_logs FOR UPDATE TO authenticated
  USING (user_has_company(auth.uid(), company_id) OR is_admin(auth.uid()))
  WITH CHECK (user_has_company(auth.uid(), company_id) OR is_admin(auth.uid()));

CREATE POLICY "Users delete own company reminder logs"
  ON public.reminder_logs FOR DELETE TO authenticated
  USING (user_has_company(auth.uid(), company_id) OR is_admin(auth.uid()));
