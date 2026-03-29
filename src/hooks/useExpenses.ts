import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";

export interface ExpenseCategory {
  id: string;
  company_id: string | null;
  name: string;
  code: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  company_id: string | null;
  expense_number: string;
  expense_date: string;
  supplier_id: string | null;
  category_id: string | null;
  description: string;
  amount_ht: number;
  tva_rate: number;
  amount_tva: number;
  amount_ttc: number;
  payment_status: "pending" | "paid" | "cancelled";
  payment_method: "cash" | "cheque" | "transfer" | "card" | "lcn" | null;
  payment_date: string | null;
  bank_account_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  supplier?: { name: string } | null;
  category?: { name: string; color: string } | null;
  bank_account?: { account_name: string; bank_name: string } | null;
}

// ─── Categories ──────────────────────────────────────────────────────

export function useExpenseCategories() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeCompany } = useCompany();

  const fetch = useCallback(async () => {
    if (!activeCompany?.id) { setCategories([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("expense_categories")
      .select("*")
      .eq("is_active", true)
      .eq("company_id", activeCompany.id)
      .order("name");
    if (!error) setCategories((data || []) as ExpenseCategory[]);
    setLoading(false);
  }, [activeCompany?.id]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (values: Partial<ExpenseCategory>) => {
    const { error } = await (supabase as any)
      .from("expense_categories")
      .insert({ ...values, company_id: activeCompany?.id ?? null });
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return false; }
    toast({ title: "Catégorie créée" });
    await fetch();
    return true;
  };

  const update = async (id: string, values: Partial<ExpenseCategory>) => {
    const { error } = await (supabase as any)
      .from("expense_categories")
      .update(values)
      .eq("id", id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return false; }
    toast({ title: "Catégorie mise à jour" });
    await fetch();
    return true;
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("expense_categories").update({ is_active: false }).eq("id", id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return false; }
    await fetch();
    return true;
  };

  return { categories, loading, fetch, create, update, remove };
}

// ─── Expenses ─────────────────────────────────────────────────────────

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? null;

  const fetchExpenses = useCallback(async () => {
    if (!companyId) { setExpenses([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("expenses")
      .select(`
        *,
        supplier:suppliers(name),
        category:expense_categories(name, color),
        bank_account:bank_accounts(account_name, bank_name)
      `)
      .eq("company_id", companyId)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setExpenses((data || []) as Expense[]);
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const create = async (values: Partial<Expense>) => {
    const { data: num, error: nErr } = await supabase.rpc("next_document_number", { p_type: "DEP", p_company_id: companyId } as any);
    if (nErr) {
      toast({ title: "Erreur numérotation", description: nErr.message, variant: "destructive" });
      return null;
    }

    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { data, error } = await (supabase as any)
      .from("expenses")
      .insert({
        ...values,
        expense_number: num,
        company_id: companyId,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return null;
    }

    // Treasury impact: if paid immediately, debit bank account
    if (values.payment_status === "paid" && values.bank_account_id) {
      await applyTreasuryImpact(values.bank_account_id, Number(values.amount_ttc));
    }

    await (supabase as any).from("audit_logs").insert({
      action: "create_expense",
      table_name: "expenses",
      record_id: data.id,
      details: `Dépense ${num} — ${values.description} — ${values.amount_ttc} MAD`,
      user_id: userId,
    });

    toast({ title: "Dépense créée", description: num as string });
    await fetchExpenses();
    return data;
  };

  const update = async (id: string, values: Partial<Expense>) => {
    const existing = expenses.find(e => e.id === id);
    const { error } = await (supabase as any)
      .from("expenses")
      .update(values)
      .eq("id", id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }

    // Treasury impact: newly marked as paid
    if (
      values.payment_status === "paid" &&
      existing?.payment_status !== "paid" &&
      values.bank_account_id
    ) {
      await applyTreasuryImpact(values.bank_account_id, Number(values.amount_ttc ?? existing?.amount_ttc));
    }
    // Reverse: cancelled after being paid
    if (
      values.payment_status === "cancelled" &&
      existing?.payment_status === "paid" &&
      existing?.bank_account_id
    ) {
      await reverseTreasuryImpact(existing.bank_account_id, Number(existing.amount_ttc));
    }

    toast({ title: "Dépense mise à jour" });
    await fetchExpenses();
    return true;
  };

  const markPaid = async (id: string, bankAccountId: string, paymentMethod: string, paymentDate: string) => {
    return update(id, {
      payment_status: "paid",
      bank_account_id: bankAccountId,
      payment_method: paymentMethod as any,
      payment_date: paymentDate,
    });
  };

  const cancel = async (id: string) => update(id, { payment_status: "cancelled" });

  const remove = async (id: string) => {
    const exp = expenses.find(e => e.id === id);
    const { error } = await (supabase as any).from("expenses").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    // Reverse treasury if was paid
    if (exp?.payment_status === "paid" && exp?.bank_account_id) {
      await reverseTreasuryImpact(exp.bank_account_id, Number(exp.amount_ttc));
    }
    toast({ title: "Dépense supprimée" });
    await fetchExpenses();
    return true;
  };

  return { expenses, loading, fetchExpenses, create, update, markPaid, cancel, remove };
}

// ─── Treasury helpers ─────────────────────────────────────────────────

async function applyTreasuryImpact(bankAccountId: string, amount: number) {
  const { data } = await (supabase as any)
    .from("bank_accounts")
    .select("current_balance")
    .eq("id", bankAccountId)
    .single();
  if (data) {
    await (supabase as any)
      .from("bank_accounts")
      .update({ current_balance: Number(data.current_balance) - amount })
      .eq("id", bankAccountId);
  }
}

async function reverseTreasuryImpact(bankAccountId: string, amount: number) {
  const { data } = await (supabase as any)
    .from("bank_accounts")
    .select("current_balance")
    .eq("id", bankAccountId)
    .single();
  if (data) {
    await (supabase as any)
      .from("bank_accounts")
      .update({ current_balance: Number(data.current_balance) + amount })
      .eq("id", bankAccountId);
  }
}
