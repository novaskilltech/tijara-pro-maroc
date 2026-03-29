import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface SystemSettings {
  id: string;
  tva_rates: number[];
  default_tva: number;
  default_currency: string;
  default_payment_terms: string;
  doc_numbering_format: string;
  allow_negative_stock: boolean;
  allow_admin_overrides: boolean;
  enable_attachments: boolean;
  require_double_validation: boolean;
  created_at: string;
  updated_at: string;
}

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("system_settings")
      .select("*")
      .limit(1)
      .single();
    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    if (data) {
      setSettings({
        ...data,
        tva_rates: Array.isArray(data.tva_rates) ? data.tva_rates : JSON.parse(data.tva_rates),
      });
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const update = async (updates: Partial<SystemSettings>) => {
    if (!settings) return false;
    const { error } = await (supabase as any)
      .from("system_settings")
      .update(updates)
      .eq("id", settings.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Paramètres mis à jour" });
    await fetch();
    return true;
  };

  return { settings, loading, update, refresh: fetch };
}
