import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";

export interface CashRegister {
  id: string;
  name: string;
  code: string;
  warehouse_id: string | null;
  assigned_user_id: string | null;
  opening_balance: number;
  current_balance: number;
  is_active: boolean;
  created_at: string;
  warehouse?: { name: string } | null;
}

export interface CashMovement {
  id: string;
  cash_register_id: string;
  movement_type: string;
  amount: number;
  reference: string | null;
  payment_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export function useCashRegisters() {
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? null;

  const fetch = useCallback(async () => {
    if (!companyId) { setRegisters([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("cash_registers")
      .select("*, warehouse:warehouses(name)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    setRegisters(data || []);
    setLoading(false);
  }, [companyId]);

  const fetchMovements = async (registerId: string) => {
    const { data } = await (supabase as any).from("cash_register_movements").select("*").eq("cash_register_id", registerId).order("created_at", { ascending: false });
    setMovements(data || []);
  };

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (values: Partial<CashRegister>) => {
    const payload: any = { ...values, current_balance: values.opening_balance || 0 };
    if (companyId) payload.company_id = companyId;
    const { error } = await (supabase as any).from("cash_registers").insert(payload);
    if (error) {
      const msg = error.message?.includes("cash_registers_company_code_unique")
        ? "Code caisse déjà utilisé."
        : error.message?.includes("cash_registers_company_name_unique")
        ? "Nom de caisse déjà utilisé."
        : error.message;
      toast({ title: "Erreur", description: msg, variant: "destructive" });
      return false;
    }
    toast({ title: "Caisse créée" });
    await fetch();
    return true;
  };

  const update = async (id: string, values: Partial<CashRegister>) => {
    const { error } = await (supabase as any).from("cash_registers").update(values).eq("id", id);
    if (error) {
      const msg = error.message?.includes("cash_registers_company_code_unique")
        ? "Code déjà utilisé."
        : error.message?.includes("cash_registers_company_name_unique")
        ? "Nom déjà utilisé."
        : error.message;
      toast({ title: "Erreur", description: msg, variant: "destructive" });
      return false;
    }
    toast({ title: "Caisse modifiée avec succès." });
    await fetch();
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("cash_registers").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Caisse supprimée" });
    await fetch();
    return true;
  };

  const addMovement = async (registerId: string, type: string, amount: number, reference?: string, notes?: string, paymentId?: string) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    await (supabase as any).from("cash_register_movements").insert({
      cash_register_id: registerId, movement_type: type, amount, reference, notes, payment_id: paymentId || null, created_by: userId, company_id: companyId,
    });
    const { data: reg } = await (supabase as any).from("cash_registers").select("current_balance").eq("id", registerId).single();
    if (reg) {
      const newBalance = type === "in" || type === "opening" ? Number(reg.current_balance) + amount : Number(reg.current_balance) - amount;
      await (supabase as any).from("cash_registers").update({ current_balance: newBalance }).eq("id", registerId);
    }
    toast({ title: "Mouvement enregistré" });
    await fetch();
    await fetchMovements(registerId);
  };

  return { registers, movements, loading, fetch, fetchMovements, create, update, remove, addMovement };
}
