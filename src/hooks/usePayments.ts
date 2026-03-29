/**
 * usePayments.ts — Payment management for TIJARAPRO
 *
 * Handles both client payments (encaissements/ENC) and supplier payments (décaissements/DEC).
 *
 * Key business rules:
 * - Cash payments are subject to a 5000 MAD daily limit per customer (Moroccan regulation)
 * - Payments are allocated to specific invoices via payment_allocations
 * - When an allocation is made, the invoice's remaining_balance is decreased
 * - Deleting a payment reverses allocations and restores invoice balances
 *
 * Dispatches "dashboard-refresh" event to keep dashboard KPIs current.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Payment {
  id: string;
  payment_number: string;
  payment_type: "client" | "supplier";
  payment_method: "cash" | "cheque" | "transfer" | "lcn";
  payment_date: string;
  amount: number;
  reference: string | null;
  notes: string | null;
  customer_id: string | null;
  supplier_id: string | null;
  bank_account_id: string | null;
  cheque_number: string | null;
  cheque_bank: string | null;
  cheque_date: string | null;
  lcn_due_date: string | null;
  is_override: boolean;
  override_reason: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  customer?: { name: string } | null;
  supplier?: { name: string } | null;
  bank_account?: { account_name: string; bank_name: string } | null;
}

export interface PaymentAllocation {
  id: string;
  payment_id: string;
  invoice_id: string;
  amount: number;
  created_at: string;
  invoice?: { invoice_number: string; total_ttc: number; remaining_balance: number } | null;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function usePayments(paymentType: "client" | "supplier") {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? null;

  const fetchPayments = useCallback(async () => {
    if (!companyId) { setPayments([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("payments")
      .select("*, customer:customers(name), supplier:suppliers(name), bank_account:bank_accounts(account_name, bank_name)")
      .eq("payment_type", paymentType)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setPayments((data || []) as Payment[]);
  }, [paymentType, companyId]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  /**
   * Moroccan regulation: cash payments to a single customer cannot exceed 5000 MAD/day.
   * Returns whether the payment is allowed and the current daily total.
   */
  const checkCashLimit = async (customerId: string, amount: number, date: string): Promise<{ allowed: boolean; totalToday: number }> => {
    if (!customerId) return { allowed: true, totalToday: 0 };
    const { data } = await (supabase as any)
      .from("payments")
      .select("amount")
      .eq("customer_id", customerId)
      .eq("payment_method", "cash")
      .eq("payment_date", date)
      .eq("is_override", false);
    const totalToday = (data || []).reduce((s: number, p: any) => s + Number(p.amount), 0);
    return { allowed: (totalToday + amount) <= 4999.99, totalToday };
  };

  /**
   * Create payment + allocate to invoices.
   * Each allocation reduces the target invoice's remaining_balance.
   * Marks invoice as "paid" when balance reaches 0.
   */
  const create = async (
    payment: Partial<Payment>,
    allocations: { invoice_id: string; amount: number }[]
  ) => {
    const prefix = paymentType === "client" ? "ENC" : "DEC";
    const { data: number, error: nErr } = await supabase.rpc("next_document_number", { p_type: prefix, p_company_id: companyId } as any);
    if (nErr) {
      toast({ title: "Erreur numérotation", description: nErr.message, variant: "destructive" });
      return null;
    }

    const { data: pmt, error: pErr } = await (supabase as any)
      .from("payments")
      .insert({
        ...payment,
        payment_number: number,
        payment_type: paymentType,
        company_id: companyId,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();

    if (pErr) {
      toast({ title: "Erreur", description: pErr.message, variant: "destructive" });
      return null;
    }

    // Allocate payment to invoices and update remaining balances
    for (const alloc of allocations) {
      await (supabase as any).from("payment_allocations").insert({
        payment_id: pmt.id, invoice_id: alloc.invoice_id, amount: alloc.amount, company_id: companyId,
      });

      const { data: inv } = await (supabase as any)
        .from("invoices").select("remaining_balance").eq("id", alloc.invoice_id).single();
      if (inv) {
        const newBalance = Math.max(0, Number(inv.remaining_balance) - alloc.amount);
        const updates: any = { remaining_balance: newBalance };
        if (newBalance === 0) updates.status = "paid";
        await (supabase as any).from("invoices").update(updates).eq("id", alloc.invoice_id);
      }
    }

    await (supabase as any).from("audit_logs").insert({
      action: "create_payment", table_name: "payments", record_id: pmt.id,
      details: `Paiement ${number} de ${payment.amount} MAD`,
      user_id: (await supabase.auth.getUser()).data.user?.id,
    });

    toast({ title: "Paiement enregistré", description: number as string });
    await fetchPayments();
    window.dispatchEvent(new Event("dashboard-refresh"));
    return pmt;
  };

  /**
   * Delete payment and reverse all its invoice allocations.
   * Restores invoice remaining_balance and sets status back to "validated".
   */
  const remove = async (id: string) => {
    const { data: allocs } = await (supabase as any)
      .from("payment_allocations").select("invoice_id, amount").eq("payment_id", id);

    // Reverse each allocation
    for (const alloc of (allocs || [])) {
      const { data: inv } = await (supabase as any)
        .from("invoices").select("remaining_balance, status").eq("id", alloc.invoice_id).single();
      if (inv) {
        await (supabase as any).from("invoices").update({
          remaining_balance: Number(inv.remaining_balance) + Number(alloc.amount),
          status: "validated",
        }).eq("id", alloc.invoice_id);
      }
    }

    const { error } = await (supabase as any).from("payments").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Paiement supprimé" });
    await fetchPayments();
    window.dispatchEvent(new Event("dashboard-refresh"));
    return true;
  };

  return { payments, loading, fetchPayments, create, remove, checkCashLimit };
}
