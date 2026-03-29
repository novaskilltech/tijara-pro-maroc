import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";

interface UnpaidInvoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_id: string;
  total_ttc: number;
  remaining_balance: number;
  due_date: string | null;
  invoice_date: string;
  days_overdue: number;
  bucket: "0-30" | "30-60" | "60+";
}

interface AgingBucket {
  label: string;
  total: number;
  count: number;
}

export function useUnpaidDashboard() {
  const [invoices, setInvoices] = useState<UnpaidInvoice[]>([]);
  const [buckets, setBuckets] = useState<AgingBucket[]>([]);
  const [totalUnpaid, setTotalUnpaid] = useState(0);
  const [loading, setLoading] = useState(true);
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? null;

  const fetch = useCallback(async () => {
    if (!companyId) { setInvoices([]); setBuckets([]); setTotalUnpaid(0); setLoading(false); return; }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("invoices")
      .select("id, invoice_number, total_ttc, remaining_balance, due_date, invoice_date, customer:customers(id, name)")
      .eq("invoice_type", "client")
      .eq("company_id", companyId)
      .in("status", ["validated", "paid"])
      .gt("remaining_balance", 0)
      .order("due_date", { ascending: true });

    const now = new Date();
    const mapped: UnpaidInvoice[] = (data || []).map((inv: any) => {
      const dueDate = inv.due_date ? new Date(inv.due_date) : new Date(inv.invoice_date);
      const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysOverdue = Math.max(0, diffDays);
      const bucket = daysOverdue <= 30 ? "0-30" : daysOverdue <= 60 ? "30-60" : "60+";
      return {
        id: inv.id,
        invoice_number: inv.invoice_number,
        customer_name: inv.customer?.name || "—",
        customer_id: inv.customer?.id || "",
        total_ttc: Number(inv.total_ttc),
        remaining_balance: Number(inv.remaining_balance),
        due_date: inv.due_date,
        invoice_date: inv.invoice_date,
        days_overdue: daysOverdue,
        bucket,
      };
    });

    setInvoices(mapped);
    setTotalUnpaid(mapped.reduce((s, i) => s + i.remaining_balance, 0));

    const b030 = mapped.filter((i) => i.bucket === "0-30");
    const b3060 = mapped.filter((i) => i.bucket === "30-60");
    const b60 = mapped.filter((i) => i.bucket === "60+");
    setBuckets([
      { label: "0-30 jours", total: b030.reduce((s, i) => s + i.remaining_balance, 0), count: b030.length },
      { label: "30-60 jours", total: b3060.reduce((s, i) => s + i.remaining_balance, 0), count: b3060.length },
      { label: "60+ jours", total: b60.reduce((s, i) => s + i.remaining_balance, 0), count: b60.length },
    ]);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { invoices, buckets, totalUnpaid, loading };
}
