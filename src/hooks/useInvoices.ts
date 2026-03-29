/**
 * useInvoices.ts — Invoice management hook for TIJARAPRO
 *
 * Manages both client (FAC) and supplier (FAF/FACF) invoices.
 * Lifecycle: draft → validated → paid | cancelled
 *
 * IMPORTANT — remaining_balance tracks unpaid amount for payment allocation.
 * IMPORTANT — Dispatches "dashboard-refresh" event on status changes to keep KPIs in sync.
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";
import { useStockEngine } from "@/hooks/useStockEngine";
import type { Invoice, InvoiceLine } from "@/types/invoice";

export function useInvoices(invoiceType: "client" | "supplier") {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeCompany } = useCompany();
  const { deductStock } = useStockEngine();
  const companyId = activeCompany?.id ?? null;

  const fetch = useCallback(async () => {
    if (!companyId) { setInvoices([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("invoices")
      .select("*, customer:customers(name, ice), supplier:suppliers(name, ice)")
      .eq("invoice_type", invoiceType)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setInvoices((data || []) as Invoice[]);
  }, [invoiceType, companyId]);

  useEffect(() => { fetch(); }, [fetch]);

  /** Generate next invoice number via server-side RPC */
  const generateNumber = async () => {
    const prefix = invoiceType === "client" ? "FAC" : "FACF";
    const { data, error } = await supabase.rpc("next_document_number", { p_type: prefix, p_company_id: companyId } as any);
    if (error) {
      toast({ title: "Erreur numérotation", description: error.message, variant: "destructive" });
      return null;
    }
    return data as string;
  };

  const create = async (invoice: Partial<Invoice>, lines: Partial<InvoiceLine>[]) => {
    const number = await generateNumber();
    if (!number) return null;

    const { data: inv, error: invErr } = await (supabase as any)
      .from("invoices")
      .insert({ ...invoice, invoice_number: number, invoice_type: invoiceType, company_id: companyId })
      .select()
      .single();

    if (invErr) {
      toast({ title: "Erreur", description: invErr.message, variant: "destructive" });
      return null;
    }

    if (lines.length > 0) {
      const linesToInsert = lines.map((l, i) => ({ ...l, invoice_id: inv.id, sort_order: i, company_id: companyId }));
      const { error: lErr } = await (supabase as any).from("invoice_lines").insert(linesToInsert);
      if (lErr) toast({ title: "Erreur lignes", description: lErr.message, variant: "destructive" });
    }

    toast({ title: "Facture créée", description: number });
    await fetch();
    return inv;
  };

  const updateInvoice = async (id: string, updates: Partial<Invoice>) => {
    const { error } = await (supabase as any).from("invoices").update(updates).eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    await fetch();
    return true;
  };

  /** Replace all lines for an invoice (delete + re-insert) */
  const updateLines = async (invoiceId: string, lines: Partial<InvoiceLine>[]) => {
    await (supabase as any).from("invoice_lines").delete().eq("invoice_id", invoiceId);
    if (lines.length > 0) {
      const linesToInsert = lines.map((l, i) => ({ ...l, invoice_id: invoiceId, sort_order: i, company_id: companyId }));
      const { error } = await (supabase as any).from("invoice_lines").insert(linesToInsert);
      if (error) {
        toast({ title: "Erreur lignes", description: error.message, variant: "destructive" });
        return false;
      }
    }
    return true;
  };

  const fetchLines = async (invoiceId: string): Promise<InvoiceLine[]> => {
    const { data, error } = await (supabase as any)
      .from("invoice_lines")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("sort_order");
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return [];
    }
    return (data || []) as InvoiceLine[];
  };

  // ── Status transitions ──

  const validateInvoice = async (id: string) => {
    // 1. Fetch invoice to check if we need to deduct stock
    const { data: inv } = await (supabase as any).from("invoices").select("*").eq("id", id).single();
    if (!inv) return false;

    // 2. Stock deduction for direct sales (no BL link, not already deducted)
    if (inv.invoice_type === "sales" && inv.warehouse_id && !inv.stock_deducted) {
      const { data: lines } = await (supabase as any).from("invoice_lines").select("*").eq("invoice_id", id);
      if (lines && lines.length > 0) {
        let allOk = true;
        for (const l of lines) {
          if (l.product_id) {
            const ok = await deductStock(l.product_id, inv.warehouse_id, Number(l.quantity), "invoice", id);
            if (!ok) {
              toast({ 
                title: "Stock insuffisant", 
                description: `Impossible de valider : stock insuffisant pour le produit à l'ID ${l.product_id}`, 
                variant: "destructive" 
              });
              allOk = false;
              break;
            }
          }
        }
        if (!allOk) return false;
      }
      
      // Mark as deducted in DB
      await (supabase as any).from("invoices").update({ stock_deducted: true }).eq("id", id);
    }

    const ok = await updateInvoice(id, { status: "validated" });
    if (ok) {
      await (supabase as any).from("audit_logs").insert({
        action: "validate_invoice", table_name: "invoices", record_id: id,
        details: "Facture validée",
        user_id: (await supabase.auth.getUser()).data.user?.id,
        company_id: companyId,
      });
      toast({ title: "Facture validée" });
      window.dispatchEvent(new Event("dashboard-refresh"));
    }
    return ok;
  };

  const cancelInvoice = async (id: string) => {
    const ok = await updateInvoice(id, { status: "cancelled" });
    if (ok) {
      await (supabase as any).from("audit_logs").insert({
        action: "cancel_invoice", table_name: "invoices", record_id: id,
        details: "Facture annulée",
        user_id: (await supabase.auth.getUser()).data.user?.id,
        company_id: companyId,
      });
      toast({ title: "Facture annulée" });
      window.dispatchEvent(new Event("dashboard-refresh"));
    }
    return ok;
  };

  const markPaid = async (id: string) => {
    const ok = await updateInvoice(id, { status: "paid", remaining_balance: 0 });
    if (ok) {
      toast({ title: "Facture marquée comme payée" });
      window.dispatchEvent(new Event("dashboard-refresh"));
    }
    return ok;
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("invoices").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Facture supprimée" });
    await fetch();
    return true;
  };

  return { invoices, loading, fetch, create, updateInvoice, updateLines, fetchLines, validateInvoice, cancelInvoice, markPaid, remove };
}
