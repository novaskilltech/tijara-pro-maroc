-- Tighten invoice_attachments RLS: remove company_id IS NULL fallback
DROP POLICY IF EXISTS "Users view own company invoice attachments" ON public.invoice_attachments;
CREATE POLICY "Users view own company invoice attachments"
  ON public.invoice_attachments FOR SELECT TO authenticated
  USING (
    (company_id IS NOT NULL AND user_has_company(auth.uid(), company_id))
    OR is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users insert own company invoice attachments" ON public.invoice_attachments;
CREATE POLICY "Users insert own company invoice attachments"
  ON public.invoice_attachments FOR INSERT TO authenticated
  WITH CHECK (
    (company_id IS NOT NULL AND user_has_company(auth.uid(), company_id))
    OR is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users delete own company invoice attachments" ON public.invoice_attachments;
CREATE POLICY "Users delete own company invoice attachments"
  ON public.invoice_attachments FOR DELETE TO authenticated
  USING (
    (company_id IS NOT NULL AND user_has_company(auth.uid(), company_id))
    OR is_admin(auth.uid())
  );