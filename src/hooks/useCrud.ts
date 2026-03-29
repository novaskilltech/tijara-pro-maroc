import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";

interface UseCrudOptions {
  table: string;
  orderBy?: string;
  ascending?: boolean;
  /** If true, automatically filter by the active company_id */
  companyScoped?: boolean;
}

export function useCrud<T extends { id: string }>({
  table,
  orderBy = "created_at",
  ascending = false,
  companyScoped = false,
}: UseCrudOptions) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeCompany } = useCompany();
  const activeCompanyId = activeCompany?.id ?? null;

  const fetch = useCallback(async () => {
    setLoading(true);
    let query = (supabase as any)
      .from(table)
      .select("*")
      .order(orderBy, { ascending });

    if (companyScoped && activeCompanyId) {
      query = query.eq("company_id", activeCompanyId);
    }

    const { data: rows, error } = await query;
    setLoading(false);
    if (error) {
      toast({ title: "Erreur de chargement", description: error.message, variant: "destructive" });
      return;
    }
    setData((rows || []) as T[]);
  }, [table, orderBy, ascending, companyScoped, activeCompanyId]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (record: Partial<T>) => {
    const payload = companyScoped && activeCompanyId
      ? { ...record, company_id: activeCompanyId }
      : record;
    const { error } = await (supabase as any).from(table).insert(payload);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Créé avec succès" });
    await fetch();
    return true;
  };

  const update = async (id: string, record: Partial<T>) => {
    const { error } = await (supabase as any).from(table).update(record).eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Mis à jour" });
    await fetch();
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from(table).delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur de suppression", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Supprimé" });
    await fetch();
    return true;
  };

  return { data, loading, fetch, create, update, remove };
}
