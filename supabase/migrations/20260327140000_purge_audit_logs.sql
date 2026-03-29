
-- ============================================================
-- RGPD: Purge automatique des logs d'audit
-- Objectif: Supprimer les entrées de plus de 12 mois pour respecter
-- les principes de minimisation des données.
-- ============================================================

CREATE OR REPLACE FUNCTION public.purge_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM public.audit_logs
    WHERE created_at < now() - interval '12 months';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Optionnel: logger la purge elle-même (mais dans une table séparée ou avec une action système)
    RAISE NOTICE 'Purge RGPD effectuée: % logs supprimés.', deleted_count;
END;
$$;

-- Note: Pour automatiser cela dans Supabase, l'utilisateur doit :
-- 1. Activer l'extension pg_cron dans le dashboard Supabase.
-- 2. Exécuter : SELECT cron.schedule('0 0 1 * *', 'SELECT public.purge_old_audit_logs()');
-- Cela exécutera la purge le 1er de chaque mois à minuit.
