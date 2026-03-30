import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";

export interface Bank {
  id: string;
  name: string;
  code: string | null;
  is_active: boolean;
  company_id: string;
  created_at?: string;
  updated_at?: string;
}

export function useBanks() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? null;

  // Use a type-safe but flexible query by casting to any if types are missing
  const banksTable = (supabase as any).from("banks");

  const fetchBanks = useCallback(async () => {
    if (!companyId) {
      setBanks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await banksTable
      .select("*")
      .eq("company_id", companyId)
      .order("name", { ascending: true });
    
    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setBanks((data as Bank[]) || []);
  }, [companyId, banksTable]);

  useEffect(() => {
    fetchBanks();
  }, [fetchBanks]);

  const createBank = async (record: Partial<Bank>) => {
    if (!companyId) return null;
    const { data, error } = await banksTable
      .insert({ ...record, company_id: companyId })
      .select()
      .single();
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return null;
    }
    const newBank = data as Bank;
    setBanks((prev) => [...prev, newBank]);
    toast({ title: "Banque créée" });
    return newBank;
  };

  const updateBank = async (id: string, record: Partial<Bank>) => {
    const { data, error } = await banksTable
      .update(record)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return null;
    }
    const updatedBank = data as Bank;
    setBanks((prev) => prev.map((b) => (b.id === id ? updatedBank : b)));
    toast({ title: "Banque mise à jour" });
    return updatedBank;
  };

  const deleteBank = async (id: string) => {
    const { error } = await banksTable.delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    setBanks((prev) => prev.filter((b) => b.id !== id));
    toast({ title: "Banque supprimée" });
    return true;
  };

  return { banks, loading, fetchBanks, createBank, updateBank, deleteBank };
}
