import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { CreditNote, CreditNoteLine } from "@/types/invoice";
import { useCompany } from "@/hooks/useCompany";

export function useCreditNotes() {
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? null;

  const fetch = useCallback(async () => {
    if (!companyId) { setCreditNotes([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("credit_notes")
      .select("*, customer:customers(name), supplier:suppliers(name), invoice:invoices(invoice_number)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    setCreditNotes((data || []) as CreditNote[]);
  }, [companyId]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (cn: Partial<CreditNote>, lines: Partial<CreditNoteLine>[]) => {
    const prefix = cn.credit_note_type === "client" ? "AVC" : "AVF";
    const { data: num, error: nErr } = await supabase.rpc("next_document_number", { p_type: prefix, p_company_id: companyId } as any);
    if (nErr) {
      toast({ title: "Erreur numérotation", description: nErr.message, variant: "destructive" });
      return null;
    }

    const { data: created, error } = await (supabase as any)
      .from("credit_notes")
      .insert({ ...cn, credit_note_number: num })
      .select()
      .single();

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return null;
    }

    if (lines.length > 0) {
      const linesToInsert = lines.map((l, i) => ({ ...l, credit_note_id: created.id, sort_order: i, company_id: companyId }));
      await (supabase as any).from("credit_note_lines").insert(linesToInsert);
    }

    toast({ title: "Avoir créé", description: num as string });
    await fetch();
    return created;
  };

  const validate = async (id: string, invoiceId: string | null, totalTtc: number) => {
    const { error } = await (supabase as any).from("credit_notes").update({ status: "validated" }).eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }

    // Reduce invoice remaining balance
    if (invoiceId) {
      const { data: inv } = await (supabase as any).from("invoices").select("remaining_balance").eq("id", invoiceId).single();
      if (inv) {
        const newBalance = Math.max(0, (inv.remaining_balance || 0) - totalTtc);
        await (supabase as any).from("invoices").update({ remaining_balance: newBalance }).eq("id", invoiceId);
      }
    }

    await (supabase as any).from("audit_logs").insert({
      action: "validate_credit_note",
      table_name: "credit_notes",
      record_id: id,
      details: "Avoir validé",
      user_id: (await supabase.auth.getUser()).data.user?.id,
    });

    toast({ title: "Avoir validé" });
    await fetch();
    return true;
  };

  const cancel = async (id: string) => {
    const { error } = await (supabase as any).from("credit_notes").update({ status: "cancelled" }).eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Avoir annulé" });
    await fetch();
    return true;
  };

  return { creditNotes, loading, fetch, create, validate, cancel };
}
