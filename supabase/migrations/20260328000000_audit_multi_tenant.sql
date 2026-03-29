-- ============================================================
-- AUDIT LOGS MULTI-TENANT & RLS
-- Objectif: Assurer que les administrateurs ne voient que les
-- logs de leur propre entreprise.
-- ============================================================

-- 1. Ajouter la colonne company_id si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'audit_logs'
          AND column_name = 'company_id'
    ) THEN
        ALTER TABLE public.audit_logs ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
END
$$;

-- 2. Index pour la performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON public.audit_logs(company_id);

-- 3. Mettre à jour la RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users view own company logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users insert own company logs" ON public.audit_logs;

-- Les administrateurs peuvent voir les logs de leur compagnie
CREATE POLICY "Admins view own company logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid()) 
    AND (
      company_id IS NULL OR 
      public.user_has_company(auth.uid(), company_id)
    )
  );

-- Tout utilisateur authentifié peut insérer un log s'il est lié à sa compagnie
CREATE POLICY "Authenticated users can insert logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      company_id IS NULL OR 
      public.user_has_company(auth.uid(), company_id)
    )
  );

-- Note: En production, il faudra peut-être déclencher un script pour peupler 
-- les anciens `company_id` à partir des tables `table_name` et `record_id`.
