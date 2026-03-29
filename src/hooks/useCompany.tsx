import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface Company {
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
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CompanyContextType {
  activeCompany: Company | null;
  companies: Company[];
  loading: boolean;
  switchCompany: (company: Company) => void;
  refetch: () => Promise<void>;
  createCompany: (data: Partial<Company>) => Promise<boolean>;
  updateCompany: (id: string, data: Partial<Company>) => Promise<boolean>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

const ACTIVE_COMPANY_KEY = "tijarapro_active_company_id";

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("companies")
      .select("*")
      .eq("is_active", true)
      .order("raison_sociale");

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const list: Company[] = (data || []) as Company[];
    setCompanies(list);

    // Restore last active company from localStorage
    const savedId = localStorage.getItem(ACTIVE_COMPANY_KEY);
    const saved = list.find(c => c.id === savedId);
    if (saved) {
      setActiveCompany(saved);
    } else if (list.length > 0) {
      setActiveCompany(list[0]);
      localStorage.setItem(ACTIVE_COMPANY_KEY, list[0].id);
    }

    setLoading(false);
  }, [user, toast]);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const switchCompany = (company: Company) => {
    setActiveCompany(company);
    localStorage.setItem(ACTIVE_COMPANY_KEY, company.id);
  };

  const createCompany = async (data: Partial<Company>) => {
    const { error } = await (supabase as any).from("companies").insert(data);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Société créée avec succès" });
    await fetchCompanies();
    return true;
  };

  const updateCompany = async (id: string, data: Partial<Company>) => {
    const { error } = await (supabase as any).from("companies").update(data).eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Société mise à jour" });
    await fetchCompanies();
    return true;
  };

  return (
    <CompanyContext.Provider value={{
      activeCompany,
      companies,
      loading,
      switchCompany,
      refetch: fetchCompanies,
      createCompany,
      updateCompany,
    }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany must be used within CompanyProvider");
  return ctx;
}
