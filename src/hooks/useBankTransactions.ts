import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";

export interface BankTransaction {
  id: string;
  bank_account_id: string;
  transaction_date: string;
  description: string;
  reference: string | null;
  debit: number;
  credit: number;
  is_reconciled: boolean;
  reconciled_payment_id: string | null;
  reconciled_by: string | null;
  reconciled_at: string | null;
  imported_at: string;
  created_at: string;
}

export function useBankTransactions(bankAccountId: string | null) {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? null;

  const fetchTransactions = useCallback(async () => {
    if (!bankAccountId) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("bank_transactions")
      .select("*")
      .eq("bank_account_id", bankAccountId)
      .order("transaction_date", { ascending: false });
    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setTransactions((data || []) as BankTransaction[]);
  }, [bankAccountId]);

  const importTransactions = async (rows: { date: string; description: string; reference?: string; debit: number; credit: number }[]) => {
    if (!bankAccountId) return;
    const toInsert = rows.map((r) => ({
      bank_account_id: bankAccountId,
      transaction_date: r.date,
      description: r.description,
      reference: r.reference || null,
      debit: r.debit || 0,
      credit: r.credit || 0,
      company_id: companyId,
    }));
    const { error } = await (supabase as any).from("bank_transactions").insert(toInsert);
    if (error) {
      toast({ title: "Erreur import", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Import réussi", description: `${rows.length} transactions importées` });
    await fetchTransactions();
    return true;
  };

  const reconcile = async (transactionId: string, paymentId: string) => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { error } = await (supabase as any).from("bank_transactions").update({
      is_reconciled: true,
      reconciled_payment_id: paymentId,
      reconciled_by: userId,
      reconciled_at: new Date().toISOString(),
    }).eq("id", transactionId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    await (supabase as any).from("audit_logs").insert({
      action: "reconcile_transaction",
      table_name: "bank_transactions",
      record_id: transactionId,
      details: `Rapprochement avec paiement ${paymentId}`,
      user_id: userId,
    });
    toast({ title: "Transaction rapprochée" });
    await fetchTransactions();
    return true;
  };

  return { transactions, loading, fetchTransactions, importTransactions, reconcile };
}
