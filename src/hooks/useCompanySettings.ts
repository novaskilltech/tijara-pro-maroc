import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";

export interface CompanySettings {
  id: string;
  raison_sociale: string;
  forme_juridique: string;
  ice: string;
  if_number: string;
  rc: string;
  patente: string;
  cnss: string;
  capital: number;
  address: string;
  city: string;
  postal_code: string;
  phone: string;
  fax: string;
  email: string;
  website: string;
  logo_url: string | null;
  legal_mentions: string | null;
}

export interface CompanyBankAccount {
  id: string;
  company_id: string;
  bank_name: string;
  account_name: string;
  account_number: string | null;
  rib: string | null;
  swift: string | null;
  currency: string;
  is_default: boolean;
  is_active: boolean;
  initial_balance: number;
  current_balance: number;
  created_at: string;
  updated_at: string;
}

export function useCompanySettings() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? null;

  const fetch = useCallback(async () => {
    setLoading(true);
    if (companyId) {
      // Multi-company mode: read from companies table (no bank fields here)
      const { data, error } = await (supabase as any)
        .from("companies")
        .select("id, raison_sociale, forme_juridique, ice, if_number, rc, patente, cnss, capital, address, city, postal_code, phone, fax, email, website, logo_url, legal_mentions")
        .eq("id", companyId)
        .maybeSingle();
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      } else if (data) {
        setSettings(data as CompanySettings);
      }
      setLoading(false);
      return;
    }
    // Fallback: legacy company_settings table
    const { data, error } = await supabase
      .from("company_settings")
      .select("id, raison_sociale, forme_juridique, ice, if_number, rc, patente, cnss, capital, address, city, postal_code, phone, fax, email, website, logo_url, legal_mentions")
      .limit(1)
      .maybeSingle();
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else if (data) {
      setSettings(data as unknown as CompanySettings);
    }
    setLoading(false);
  }, [toast, companyId]);

  useEffect(() => { fetch(); }, [fetch]);

  const update = async (values: Partial<CompanySettings>) => {
    if (!settings) return false;
    // Strip any legacy bank fields that don't exist on companies table
    const { ...safeValues } = values as any;
    delete safeValues.bank_name;
    delete safeValues.bank_rib;
    delete safeValues.bank_swift;

    if (companyId) {
      const { error } = await (supabase as any)
        .from("companies")
        .update(safeValues)
        .eq("id", companyId);
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
        return false;
      }
      toast({ title: "Succès", description: "Paramètres société enregistrés." });
      await fetch();
      return true;
    }
    // Fallback: legacy table
    const { error } = await supabase
      .from("company_settings")
      .update(safeValues as any)
      .eq("id", settings.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Succès", description: "Paramètres société enregistrés." });
    await fetch();
    return true;
  };

  const uploadLogo = async (file: File) => {
    const ext = file.name.split(".").pop();
    // Add a timestamp to bust browser cache on same-named files
    const path = `logo-${companyId || "default"}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("company-assets")
      .upload(path, file, { upsert: true, cacheControl: "0" });
    if (error) {
      toast({ title: "Erreur upload", description: error.message, variant: "destructive" });
      return null;
    }
    const { data: urlData } = supabase.storage.from("company-assets").getPublicUrl(path);
    return urlData.publicUrl;
  };

  return { settings, loading, update, uploadLogo, refetch: fetch };
}

// ─── Hook for company bank accounts (uses existing bank_accounts table) ───

export function useCompanyBankAccounts() {
  const [accounts, setAccounts] = useState<CompanyBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? null;

  const fetch = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("bank_accounts")
      .select("*")
      .eq("company_id", companyId)
      .order("is_default", { ascending: false })
      .order("created_at");
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setAccounts((data || []) as CompanyBankAccount[]);
    }
    setLoading(false);
  }, [companyId, toast]);

  useEffect(() => { fetch(); }, [fetch]);

  const createAccount = async (values: Partial<CompanyBankAccount>) => {
    if (!companyId) return false;
    // If first account, make it default
    const isFirst = accounts.length === 0;
    const { error } = await (supabase as any)
      .from("bank_accounts")
      .insert({ ...values, company_id: companyId, is_default: isFirst || values.is_default });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Compte bancaire créé" });
    await fetch();
    return true;
  };

  const updateAccount = async (id: string, values: Partial<CompanyBankAccount>) => {
    const { error } = await (supabase as any)
      .from("bank_accounts")
      .update(values)
      .eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Compte mis à jour" });
    await fetch();
    return true;
  };

  const deleteAccount = async (id: string) => {
    const { error } = await (supabase as any)
      .from("bank_accounts")
      .delete()
      .eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Compte supprimé" });
    await fetch();
    return true;
  };

  const setDefault = async (id: string) => {
    if (!companyId) return;
    // Remove default from all accounts of this company first
    await (supabase as any)
      .from("bank_accounts")
      .update({ is_default: false })
      .eq("company_id", companyId);
    await (supabase as any)
      .from("bank_accounts")
      .update({ is_default: true })
      .eq("id", id);
    await fetch();
  };

  const defaultAccount = accounts.find(a => a.is_default) ?? accounts[0] ?? null;

  return { accounts, defaultAccount, loading, fetch, createAccount, updateAccount, deleteAccount, setDefault };
}
