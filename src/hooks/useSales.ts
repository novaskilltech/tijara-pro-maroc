import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";
import { calcTotalsWithGlobalDiscount, type GlobalDiscount } from "@/components/GlobalDiscountSection";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SalesDocLine {
  id?: string;
  product_id: string | null;
  description: string;
  quantity: number;
  delivered_qty?: number;
  invoiced_qty?: number;
  unit_price: number;
  discount_percent: number;
  tva_rate: number;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  sort_order: number;
}

export interface SalesDoc {
  id: string;
  number: string;
  customer_id: string;
  date: string;
  validity_date?: string | null;
  order_date?: string | null;
  status: string;
  subtotal_ht: number;
  total_tva: number;
  total_ttc: number;
  notes: string | null;
  payment_terms: string | null;
  warehouse_id: string | null;
  cancel_reason?: string | null;
  sales_order_id?: string | null;
  quotation_id?: string | null;
  delivery_id?: string | null;
  invoice_id?: string | null;
  source_id?: string | null;
  source_type?: string | null;
  created_at: string;
  customer?: { name: string; code: string };
  warehouse?: { name: string };
  lines?: SalesDocLine[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function calcLine(l: Partial<SalesDocLine>): SalesDocLine {
  const qty = Number(l.quantity || 0);
  const price = Number(l.unit_price || 0);
  const disc = Number(l.discount_percent || 0);
  const tva = Number(l.tva_rate ?? 20);
  const ht = qty * price * (1 - disc / 100);
  const tvaAmt = ht * tva / 100;
  return {
    ...l,
    quantity: qty,
    unit_price: price,
    discount_percent: disc,
    tva_rate: tva,
    total_ht: Math.round(ht * 100) / 100,
    total_tva: Math.round(tvaAmt * 100) / 100,
    total_ttc: Math.round((ht + tvaAmt) * 100) / 100,
    sort_order: l.sort_order || 0,
  } as SalesDocLine;
}

export function calcTotals(lines: SalesDocLine[]) {
  const calculated = lines.map(calcLine);
  return {
    lines: calculated,
    subtotal_ht: Math.round(calculated.reduce((s, l) => s + l.total_ht, 0) * 100) / 100,
    total_tva: Math.round(calculated.reduce((s, l) => s + l.total_tva, 0) * 100) / 100,
    total_ttc: Math.round(calculated.reduce((s, l) => s + l.total_ttc, 0) * 100) / 100,
  };
}

async function auditLog(action: string, tableName: string, recordId: string, companyId: string | null, details?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  await (supabase as any).from("audit_logs").insert({
    action, table_name: tableName, record_id: recordId, details, user_id: user?.id, company_id: companyId,
  });
}

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

// ─── Status maps ─────────────────────────────────────────────────────────────

export const QUOTATION_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  confirmed: "Confirmé",
  converted: "Converti en BC",
  cancelled: "Annulé",
  expired: "Expiré",
  pending_admin: "En attente validation",
};

export const QUOTATION_STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  sent: "bg-secondary/20 text-secondary-foreground border-secondary/30",
  confirmed: "bg-success/15 text-success border-success/30",
  converted: "bg-primary/15 text-primary border-primary/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  expired: "bg-warning/15 text-warning-foreground border-warning/30",
  pending_admin: "bg-warning/15 text-warning-foreground border-warning/30",
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  confirmed: "Confirmé",
  partially_delivered: "Partiellement livré",
  delivered: "Livré",
  invoiced: "Facturé",
  cancelled: "Annulé",
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  confirmed: "bg-primary/15 text-primary border-primary/20",
  partially_delivered: "bg-warning/15 text-warning-foreground border-warning/30",
  delivered: "bg-success/15 text-success border-success/30",
  invoiced: "bg-accent text-accent-foreground border-border",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  validated: "Validé",
  cancelled: "Annulé",
};

export const DELIVERY_STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  validated: "bg-success/15 text-success border-success/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

// ─── useQuotations ────────────────────────────────────────────────────────────

export function useQuotations() {
  const [items, setItems] = useState<SalesDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? null;

  const fetch = useCallback(async () => {
    if (!companyId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("quotations")
      .select("*, customer:customers(name, code), warehouse:warehouses(name)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (!error) {
      setItems((data || []).map((d: any) => ({
        ...d,
        number: d.quotation_number,
        date: d.quotation_date,
      })));
    }
  }, [companyId]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (params: {
    customerId: string;
    warehouseId?: string;
    lines: SalesDocLine[];
    notes?: string;
    paymentTerms?: string;
    validityDate?: string;
    globalDiscount?: GlobalDiscount;
  }) => {
    const { data: num } = await supabase.rpc("next_document_number", { p_type: "DEV", p_company_id: companyId } as any);
    const { lines: calcLines } = calcTotals(params.lines);
    const gd = params.globalDiscount || { type: "percentage" as const, value: 0 };
    const totals = calcTotalsWithGlobalDiscount(calcLines, gd.type, gd.value);
    const userId = await getUserId();

    const { data, error } = await (supabase as any).from("quotations").insert({
      quotation_number: num,
      customer_id: params.customerId,
      warehouse_id: params.warehouseId || null,
      subtotal_ht: totals.subtotalHt, total_tva: totals.totalTva, total_ttc: totals.totalTtc,
      global_discount_type: gd.type,
      global_discount_value: gd.value,
      global_discount_amount: totals.globalDiscountAmount,
      notes: params.notes || null,
      payment_terms: params.paymentTerms || "30j",
      validity_date: params.validityDate || null,
      created_by: userId,
      company_id: companyId,
      status: "draft",
    }).select().single();

    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return null; }

    for (let i = 0; i < calcLines.length; i++) {
      const l = calcLines[i];
      await (supabase as any).from("quotation_lines").insert({
        quotation_id: data.id,
        product_id: l.product_id || null,
        description: l.description,
        quantity: l.quantity,
        unit_price: l.unit_price,
        discount_percent: l.discount_percent,
        tva_rate: l.tva_rate,
        total_ht: l.total_ht,
        total_tva: l.total_tva,
        total_ttc: l.total_ttc,
        sort_order: i,
        company_id: companyId,
      });
    }

    await auditLog("create_quotation", "quotations", data.id, companyId, `DEV: ${num}`);
    toast({ title: "Devis créé", description: num as string });
    await fetch();
    return data;
  };

  const update = async (id: string, params: {
    customerId?: string;
    warehouseId?: string;
    lines?: SalesDocLine[];
    notes?: string;
    paymentTerms?: string;
    validityDate?: string;
  }) => {
    const updates: any = {};
    if (params.customerId !== undefined) updates.customer_id = params.customerId;
    if (params.warehouseId !== undefined) updates.warehouse_id = params.warehouseId;
    if (params.notes !== undefined) updates.notes = params.notes;
    if (params.paymentTerms !== undefined) updates.payment_terms = params.paymentTerms;
    if (params.validityDate !== undefined) updates.validity_date = params.validityDate || null;

    if (params.lines) {
      const { lines: calcLines, subtotal_ht, total_tva, total_ttc } = calcTotals(params.lines);
      updates.subtotal_ht = subtotal_ht;
      updates.total_tva = total_tva;
      updates.total_ttc = total_ttc;

      await (supabase as any).from("quotation_lines").delete().eq("quotation_id", id);
      for (let i = 0; i < calcLines.length; i++) {
        const l = calcLines[i];
        await (supabase as any).from("quotation_lines").insert({
          quotation_id: id,
          product_id: l.product_id || null,
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          discount_percent: l.discount_percent,
          tva_rate: l.tva_rate,
          total_ht: l.total_ht,
          total_tva: l.total_tva,
          total_ttc: l.total_ttc,
          sort_order: i,
          company_id: companyId,
        });
      }
    }

    const { error } = await (supabase as any).from("quotations").update(updates).eq("id", id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Devis sauvegardé" });
    await fetch();
  };

  const markSent = async (id: string) => {
    await (supabase as any).from("quotations").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", id);
    await auditLog("mark_sent_quotation", "quotations", id, companyId);
    toast({ title: "Devis marqué comme envoyé" });
    await fetch();
  };

  const confirm = async (id: string) => {
    const userId = await getUserId();
    await (supabase as any).from("quotations").update({ status: "confirmed", confirmed_at: new Date().toISOString() }).eq("id", id);
    await auditLog("confirm_quotation", "quotations", id, companyId, `Confirmé par ${userId}`);
    toast({ title: "Devis confirmé" });
    await fetch();
  };

  // Legacy alias for old code
  const validate = confirm;
  const adminValidate = confirm;

  const cancel = async (id: string, reason?: string) => {
    const userId = await getUserId();
    await (supabase as any).from("quotations").update({
      status: "cancelled",
      cancel_reason: reason || null,
      cancelled_at: new Date().toISOString(),
      cancelled_by: userId,
    }).eq("id", id);
    await auditLog("cancel_quotation", "quotations", id, companyId, reason ? `Motif: ${reason}` : undefined);
    toast({ title: "Devis annulé" });
    await fetch();
  };

  const convertToOrder = async (quotationId: string, warehouseId: string) => {
    const { data: q } = await (supabase as any).from("quotations").select("*").eq("id", quotationId).single();
    const { data: qLines } = await (supabase as any).from("quotation_lines").select("*").eq("quotation_id", quotationId).order("sort_order");
    if (!q || !qLines) return null;

    const { data: num } = await supabase.rpc("next_document_number", { p_type: "BC", p_company_id: companyId } as any);
    const userId = await getUserId();

    const { data: so, error } = await (supabase as any).from("sales_orders").insert({
      order_number: num,
      quotation_id: quotationId,
      customer_id: q.customer_id,
      warehouse_id: warehouseId || q.warehouse_id,
      subtotal_ht: q.subtotal_ht,
      total_tva: q.total_tva,
      total_ttc: q.total_ttc,
      global_discount_type: q.global_discount_type || "percentage",
      global_discount_value: q.global_discount_value || 0,
      global_discount_amount: q.global_discount_amount || 0,
      notes: q.notes,
      payment_terms: q.payment_terms,
      created_by: userId,
      company_id: companyId,
      status: "draft",
    }).select().single();

    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return null; }

    for (const l of qLines) {
      await (supabase as any).from("sales_order_lines").insert({
        sales_order_id: so.id,
        product_id: l.product_id || null,
        description: l.description,
        quantity: l.quantity,
        unit_price: l.unit_price,
        discount_percent: l.discount_percent,
        tva_rate: l.tva_rate,
        total_ht: l.total_ht,
        total_tva: l.total_tva,
        total_ttc: l.total_ttc,
        sort_order: l.sort_order,
        company_id: companyId,
      });
    }

    await (supabase as any).from("quotations").update({ status: "converted", sales_order_id: so.id }).eq("id", quotationId);
    await auditLog("convert_quotation_to_order", "quotations", quotationId, companyId, `BC: ${num}`);
    toast({ title: "Bon de commande créé", description: num as string });
    await fetch();
    return so;
  };

  const getLines = async (quotationId: string): Promise<SalesDocLine[]> => {
    const { data } = await (supabase as any)
      .from("quotation_lines")
      .select("*, product:products(name, code)")
      .eq("quotation_id", quotationId)
      .order("sort_order");
    return (data || []).map((l: any) => ({
      id: l.id,
      product_id: l.product_id,
      description: l.description,
      quantity: Number(l.quantity),
      unit_price: Number(l.unit_price),
      discount_percent: Number(l.discount_percent),
      tva_rate: Number(l.tva_rate),
      total_ht: Number(l.total_ht),
      total_tva: Number(l.total_tva),
      total_ttc: Number(l.total_ttc),
      sort_order: l.sort_order,
    }));
  };


  const convertFullCycle = async (
    quotationId: string,
    warehouseId: string,
    reserveStockFn: (productId: string, whId: string, qty: number) => Promise<boolean>,
    deductStockFn: (productId: string, whId: string, qty: number, refType: string, refId?: string) => Promise<boolean>,
    releaseReservationFn: (productId: string, whId: string, qty: number) => Promise<void>,
    createDeliveryFn: (orderId: string, lines: any[], dStockFn: any, rResFn: any) => Promise<any>,
    createInvoiceFn: (orderId: string) => Promise<any>
  ) => {
    try {
      toast({ title: "Démarrage de la conversion complète..." });
      
      // 1. Devis -> Commande (BC)
      const so = await convertToOrder(quotationId, warehouseId);
      if (!so) return null;

      // 2. Préparation des lignes pour la livraison
      const { data: orderLines } = await (supabase as any)
        .from("sales_order_lines")
        .select("*")
        .eq("sales_order_id", so.id);

      if (!orderLines || orderLines.length === 0) throw new Error("Aucune ligne de commande trouvée");

      const deliveryLines = orderLines.map((l: any) => ({
        sales_order_line_id: l.id,
        product_id: l.product_id,
        description: l.description,
        quantity: Number(l.quantity),
        unit_price: Number(l.unit_price),
        discount_percent: Number(l.discount_percent),
        tva_rate: Number(l.tva_rate),
      }));

      // 3. Confirmation BC (Réservation Stock)
      // Note: On simule l'appel à confirm() qui est normalement dans useSalesOrders
      // Mais ici on passe les fns nécessaires.
      for (const line of deliveryLines) {
        if (line.product_id) {
          const ok = await reserveStockFn(line.product_id, warehouseId, line.quantity);
          if (!ok) {
            toast({ title: "Stock insuffisant", description: `Produit ${line.description} indisponible.`, variant: "destructive" });
            return null;
          }
        }
      }
      
      await (supabase as any).from("sales_orders").update({ 
        status: "confirmed", 
        confirmed_at: new Date().toISOString() 
      }).eq("id", so.id);

      // 4. Création & Validation Livraison (BL)
      const del = await createDeliveryFn(so.id, deliveryLines, deductStockFn, releaseReservationFn);
      if (!del) throw new Error("Échec création livraison");

      // 5. Création Facture (FAC)
      const inv = await createInvoiceFn(so.id);
      
      toast({ title: "Conversion réussie !", description: `BC, BL et Facture créés avec succès.` });
      await fetch();
      return { so, del, inv };
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erreur conversion complète", description: err.message, variant: "destructive" });
      return null;
    }
  };

  const convertQuotationToDelivery = async (quotationId: string, warehouseId?: string) => {
    const { data: q } = await (supabase as any).from("quotations").select("*").eq("id", quotationId).single();
    const { data: qLines } = await (supabase as any).from("quotation_lines").select("*").eq("quotation_id", quotationId).order("sort_order");
    if (!q || !qLines) return null;

    const { data: num, error: numError } = await supabase.rpc("next_document_number", { p_type: "BL", p_company_id: companyId } as any);
    if (numError) { toast({ title: "Erreur Numéro", description: numError.message, variant: "destructive" }); return null; }
    
    const userId = await getUserId();

    const { data: del, error: delError } = await (supabase as any).from("deliveries").insert({
      delivery_number: num,
      quotation_id: quotationId,
      customer_id: q.customer_id,
      warehouse_id: warehouseId || q.warehouse_id,
      notes: q.notes,
      created_by: userId,
      company_id: companyId,
      status: "draft",
      delivery_date: new Date().toISOString().split('T')[0],
    }).select().single();

    if (delError) { toast({ title: "Erreur Création BL", description: delError.message, variant: "destructive" }); return null; }

    for (const l of qLines) {
      await (supabase as any).from("delivery_lines").insert({
        delivery_id: del.id,
        product_id: l.product_id || null,
        description: l.description,
        quantity: l.quantity,
        unit_price: l.unit_price,
        discount_percent: l.discount_percent,
        tva_rate: l.tva_rate,
        total_ht: l.total_ht,
        total_tva: l.total_tva,
        total_ttc: l.total_ttc,
        sort_order: l.sort_order,
        company_id: companyId,
      });
    }

    await (supabase as any).from("quotations").update({ status: "converted" }).eq("id", quotationId);
    await auditLog("convert_quotation_to_delivery", "quotations", quotationId, companyId, `BL: ${num}`);
    toast({ title: "Bon de livraison créé", description: num as string });
    await fetch();
    return del;
  };

  const convertQuotationToInvoice = async (quotationId: string, warehouseId?: string) => {
    const { data: q } = await (supabase as any).from("quotations").select("*").eq("id", quotationId).single();
    const { data: qLines } = await (supabase as any).from("quotation_lines").select("*").eq("quotation_id", quotationId).order("sort_order");
    if (!q || !qLines) return null;

    const { data: num, error: numError } = await supabase.rpc("next_document_number", { p_type: "FAC", p_company_id: companyId } as any);
    if (numError) { toast({ title: "Erreur Numéro", description: numError.message, variant: "destructive" }); return null; }
    
    const userId = await getUserId();

    const { data: inv, error: invError } = await (supabase as any).from("invoices").insert({
      invoice_number: num,
      quotation_id: quotationId,
      customer_id: q.customer_id,
      warehouse_id: warehouseId || q.warehouse_id,
      invoice_type: "sales",
      subtotal_ht: q.subtotal_ht,
      total_tva: q.total_tva,
      total_ttc: q.total_ttc,
      remaining_balance: q.total_ttc,
      global_discount_type: q.global_discount_type || "percentage",
      global_discount_value: q.global_discount_value || 0,
      global_discount_amount: q.global_discount_amount || 0,
      notes: q.notes,
      payment_terms: q.payment_terms,
      created_by: userId,
      company_id: companyId,
      status: "draft",
      invoice_date: new Date().toISOString().split('T')[0],
    }).select().single();

    if (invError) { toast({ title: "Erreur Création Facture", description: invError.message, variant: "destructive" }); return null; }

    for (const l of qLines) {
      await (supabase as any).from("invoice_lines").insert({
        invoice_id: inv.id,
        product_id: l.product_id || null,
        description: l.description,
        quantity: l.quantity,
        unit_price: l.unit_price,
        discount_percent: l.discount_percent,
        tva_rate: l.tva_rate,
        total_ht: l.total_ht,
        total_tva: l.total_tva,
        total_ttc: l.total_ttc,
        sort_order: l.sort_order,
        company_id: companyId,
      });
    }

    await (supabase as any).from("quotations").update({ status: "converted" }).eq("id", quotationId);
    await auditLog("convert_quotation_to_invoice", "quotations", quotationId, companyId, `FAC: ${num}`);
    toast({ title: "Facture créée", description: num as string });
    await fetch();
    return inv;
  };

  return { 
    items, 
    loading, 
    fetch, 
    create, 
    update, 
    markSent, 
    confirm, 
    validate, 
    adminValidate, 
    cancel, 
    convertToOrder, 
    convertQuotationToDelivery,
    convertQuotationToInvoice,
    convertFullCycle, 
    getLines 
  };
}

// ─── useSalesOrders ───────────────────────────────────────────────────────────

export function useSalesOrders() {
  const [items, setItems] = useState<SalesDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? null;

  const fetch = useCallback(async () => {
    if (!companyId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("sales_orders")
      .select("*, customer:customers(name, code), warehouse:warehouses(name)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    setLoading(false);
    setItems((data || []).map((d: any) => ({
      ...d,
      number: d.order_number,
      date: d.order_date || d.created_at?.slice(0, 10),
    })));
  }, [companyId]);

  useEffect(() => { fetch(); }, [fetch]);

  const confirm = async (
    id: string,
    reserveStockFn: (productId: string, warehouseId: string, qty: number) => Promise<boolean>,
    adminOverride?: boolean,
    overrideReason?: string,
  ) => {
    const { data: so } = await (supabase as any).from("sales_orders").select("warehouse_id").eq("id", id).single();
    const { data: lines } = await (supabase as any).from("sales_order_lines").select("product_id, quantity").eq("sales_order_id", id);

    if (!so?.warehouse_id) { toast({ title: "Erreur", description: "Dépôt requis", variant: "destructive" }); return false; }

    for (const line of (lines || [])) {
      if (line.product_id) {
        const ok = await reserveStockFn(line.product_id, so.warehouse_id, Number(line.quantity));
        if (!ok && !adminOverride) {
          toast({ title: "Stock insuffisant", description: "Réservation impossible. Dérogation admin requise.", variant: "destructive" });
          return false;
        }
      }
    }

    const userId = await getUserId();
    await (supabase as any).from("sales_orders").update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      confirmed_by: userId,
    }).eq("id", id);

    if (adminOverride && overrideReason) {
      await auditLog("confirm_sales_order_override", "sales_orders", id, companyId, `Dérogation stock: ${overrideReason}`);
    } else {
      await auditLog("confirm_sales_order", "sales_orders", id, companyId, "Stock réservé");
    }
    toast({ title: "BC confirmé — stock réservé" });
    await fetch();
    return true;
  };

  // Legacy alias
  const validate = (id: string, reserveStockFn: any) => confirm(id, reserveStockFn);

  const cancel = async (
    id: string,
    releaseReservationFn: (productId: string, warehouseId: string, qty: number) => Promise<void>,
    reason?: string,
  ) => {
    const { data: so } = await (supabase as any).from("sales_orders").select("warehouse_id, status").eq("id", id).single();
    if ((so?.status === "confirmed" || so?.status === "partially_delivered") && so?.warehouse_id) {
      const { data: lines } = await (supabase as any).from("sales_order_lines").select("product_id, quantity").eq("sales_order_id", id);
      for (const l of (lines || [])) {
        if (l.product_id) await releaseReservationFn(l.product_id, so.warehouse_id, Number(l.quantity));
      }
    }
    const userId = await getUserId();
    await (supabase as any).from("sales_orders").update({
      status: "cancelled",
      cancel_reason: reason || null,
      cancelled_at: new Date().toISOString(),
      cancelled_by: userId,
    }).eq("id", id);
    await auditLog("cancel_sales_order", "sales_orders", id, companyId, reason ? `Motif: ${reason}` : undefined);
    toast({ title: "BC annulé" });
    await fetch();
  };

  const createDeliveryDraft = async (orderId: string): Promise<any | null> => {
    const { data: so } = await (supabase as any).from("sales_orders").select("customer_id, warehouse_id").eq("id", orderId).single();
    if (!so) return null;

    const { data: num } = await supabase.rpc("next_document_number", { p_type: "BL", p_company_id: companyId } as any);
    const userId = await getUserId();

    const { data: del, error } = await (supabase as any).from("deliveries").insert({
      delivery_number: num,
      sales_order_id: orderId,
      customer_id: so.customer_id,
      warehouse_id: so.warehouse_id,
      created_by: userId,
      company_id: companyId,
      status: "draft",
    }).select().single();

    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return null; }

    // Copy order lines to delivery draft with 0 qty (user fills in actual qty)
    const { data: orderLines } = await (supabase as any)
      .from("sales_order_lines")
      .select("*")
      .eq("sales_order_id", orderId)
      .order("sort_order");

    for (const l of (orderLines || [])) {
      const remaining = Number(l.quantity) - Number(l.delivered_qty || 0);
      if (remaining <= 0) continue;
      await (supabase as any).from("delivery_lines").insert({
        delivery_id: del.id,
        sales_order_line_id: l.id,
        product_id: l.product_id || null,
        description: l.description,
        quantity: remaining,
        unit_price: Number(l.unit_price),
        discount_percent: Number(l.discount_percent),
        tva_rate: Number(l.tva_rate),
        total_ht: Number(l.total_ht),
        total_tva: Number(l.total_tva),
        total_ttc: Number(l.total_ttc),
        sort_order: l.sort_order,
        company_id: companyId,
      });
    }

    await auditLog("create_delivery_draft", "deliveries", del.id, companyId, `BL brouillon: ${num} depuis BC: ${orderId}`);
    toast({ title: "Bon de livraison brouillon créé", description: num as string });
    await fetch();
    return del;
  };

  // Legacy: direct delivery with stock deduction (used from DeliveryPanel)
  const createDelivery = async (
    orderId: string,
    deliveryLines: {
      sales_order_line_id: string; product_id: string; description: string;
      quantity: number; unit_price: number; discount_percent: number; tva_rate: number;
    }[],
    deductStockFn: (productId: string, warehouseId: string, qty: number, refType: string, refId?: string) => Promise<boolean>,
    releaseReservationFn: (productId: string, warehouseId: string, qty: number) => Promise<void>,
  ) => {
    const { data: so } = await (supabase as any).from("sales_orders").select("customer_id, warehouse_id").eq("id", orderId).single();
    if (!so) return null;

    const { data: num } = await supabase.rpc("next_document_number", { p_type: "BL", p_company_id: companyId } as any);
    const userId = await getUserId();

    const { data: del, error } = await (supabase as any).from("deliveries").insert({
      delivery_number: num,
      sales_order_id: orderId,
      customer_id: so.customer_id,
      warehouse_id: so.warehouse_id,
      created_by: userId,
      company_id: companyId,
      status: "validated",
      validated_at: new Date().toISOString(),
      validated_by: userId,
    }).select().single();

    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return null; }

    for (let i = 0; i < deliveryLines.length; i++) {
      const dl = deliveryLines[i];
      const calc = calcLine({ ...dl, sort_order: i });
      await (supabase as any).from("delivery_lines").insert({
        delivery_id: del.id,
        sales_order_line_id: dl.sales_order_line_id,
        product_id: dl.product_id || null,
        description: dl.description,
        quantity: dl.quantity,
        unit_price: dl.unit_price,
        discount_percent: dl.discount_percent,
        tva_rate: dl.tva_rate,
        total_ht: calc.total_ht,
        total_tva: calc.total_tva,
        total_ttc: calc.total_ttc,
        sort_order: i,
        company_id: companyId,
      });

      const { data: solData } = await (supabase as any).from("sales_order_lines").select("delivered_qty").eq("id", dl.sales_order_line_id).single();
      if (solData) {
        await (supabase as any).from("sales_order_lines").update({ delivered_qty: Number(solData.delivered_qty) + dl.quantity }).eq("id", dl.sales_order_line_id);
      }

      if (dl.product_id && so.warehouse_id) {
        await deductStockFn(dl.product_id, so.warehouse_id, dl.quantity, "delivery", del.id);
        await releaseReservationFn(dl.product_id, so.warehouse_id, dl.quantity);
      }
    }

    const { data: allLines } = await (supabase as any).from("sales_order_lines").select("quantity, delivered_qty").eq("sales_order_id", orderId);
    const fullyDelivered = (allLines || []).every((l: any) => Number(l.delivered_qty) >= Number(l.quantity));
    const partiallyDelivered = (allLines || []).some((l: any) => Number(l.delivered_qty) > 0);
    const newStatus = fullyDelivered ? "delivered" : partiallyDelivered ? "partially_delivered" : "confirmed";
    await (supabase as any).from("sales_orders").update({ status: newStatus }).eq("id", orderId);

    await auditLog("create_delivery", "deliveries", del.id, companyId, `BL: ${num}`);
    toast({ title: "Bon de livraison créé", description: num as string });
    await fetch();
    return del;
  };

  const createInvoiceFromOrder = async (orderId: string): Promise<any | null> => {
    // Get delivered but not yet invoiced lines from all validated deliveries
    const { data: deliveries } = await (supabase as any)
      .from("deliveries")
      .select("id, customer_id, delivery_lines:delivery_lines(*)")
      .eq("sales_order_id", orderId)
      .eq("status", "validated");

    if (!deliveries || deliveries.length === 0) {
      toast({ title: "Aucune livraison validée", description: "Validez d'abord un bon de livraison.", variant: "destructive" });
      return null;
    }

    // Check if already invoiced
    const { data: existing } = await (supabase as any)
      .from("invoices")
      .select("id")
      .eq("sales_order_id", orderId)
      .not("status", "eq", "cancelled");

    // Collect all non-yet-invoiced delivery lines
    const allLines: any[] = [];
    for (const d of deliveries) {
      // Skip if delivery already linked to an invoice
      const { data: del } = await (supabase as any).from("deliveries").select("invoice_id").eq("id", d.id).single();
      if (del?.invoice_id) continue;
      allLines.push(...(d.delivery_lines || []));
    }

    if (allLines.length === 0) {
      toast({ title: "Déjà facturé", description: "Toutes les livraisons sont déjà facturées.", variant: "destructive" });
      return null;
    }

    const { data: so } = await (supabase as any).from("sales_orders").select("customer_id, payment_terms").eq("id", orderId).single();
    const { data: num } = await supabase.rpc("next_document_number", { p_type: "FAC", p_company_id: companyId } as any);
    const userId = await getUserId();

    const subtotal_ht = allLines.reduce((s: number, l: any) => s + Number(l.total_ht), 0);
    const total_tva = allLines.reduce((s: number, l: any) => s + Number(l.total_tva), 0);
    const total_ttc = allLines.reduce((s: number, l: any) => s + Number(l.total_ttc), 0);

    const { data: inv, error } = await (supabase as any).from("invoices").insert({
      invoice_number: num,
      invoice_type: "client",
      customer_id: so?.customer_id,
      sales_order_id: orderId,
      subtotal_ht,
      total_tva,
      total_ttc,
      remaining_balance: total_ttc,
      payment_terms: so?.payment_terms || "30j",
      status: "draft",
      created_by: userId,
      company_id: companyId,
    }).select().single();

    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return null; }

    for (const l of allLines) {
      await (supabase as any).from("invoice_lines").insert({
        invoice_id: inv.id,
        product_id: l.product_id || null,
        description: l.description,
        quantity: l.quantity,
        unit_price: l.unit_price,
        discount_percent: l.discount_percent,
        tva_rate: l.tva_rate,
        total_ht: l.total_ht,
        total_tva: l.total_tva,
        total_ttc: l.total_ttc,
        sort_order: l.sort_order,
        company_id: companyId,
      });
    }

    // Link all un-invoiced deliveries to this invoice
    for (const d of deliveries) {
      const { data: del } = await (supabase as any).from("deliveries").select("invoice_id").eq("id", d.id).single();
      if (!del?.invoice_id) {
        await (supabase as any).from("deliveries").update({ invoice_id: inv.id }).eq("id", d.id);
      }
    }

    // Mark order as invoiced
    await (supabase as any).from("sales_orders").update({ status: "invoiced", invoiced_at: new Date().toISOString() }).eq("id", orderId);
    await auditLog("create_invoice_from_order", "invoices", inv.id, `FAC: ${num} depuis BC: ${orderId}`);
    toast({ title: "Facture brouillon créée", description: num as string });
    await fetch();
    return inv;
  };

  // Legacy alias
  const createInvoiceFromDelivery = async (deliveryId: string) => {
    const { data: del } = await (supabase as any).from("deliveries").select("sales_order_id").eq("id", deliveryId).single();
    if (!del?.sales_order_id) return null;
    return createInvoiceFromOrder(del.sales_order_id);
  };

  const getLines = async (orderId: string): Promise<SalesDocLine[]> => {
    const { data } = await (supabase as any)
      .from("sales_order_lines")
      .select("*, product:products(name, code)")
      .eq("sales_order_id", orderId)
      .order("sort_order");
    return (data || []).map((l: any) => ({
      id: l.id,
      product_id: l.product_id,
      description: l.description,
      quantity: Number(l.quantity),
      delivered_qty: Number(l.delivered_qty || 0),
      invoiced_qty: Number(l.invoiced_qty || 0),
      unit_price: Number(l.unit_price),
      discount_percent: Number(l.discount_percent),
      tva_rate: Number(l.tva_rate),
      total_ht: Number(l.total_ht),
      total_tva: Number(l.total_tva),
      total_ttc: Number(l.total_ttc),
      sort_order: l.sort_order,
    }));
  };

  return {
    items, loading, fetch,
    confirm, validate, cancel,
    createDeliveryDraft, createDelivery,
    createInvoiceFromOrder, createInvoiceFromDelivery,
    getLines,
  };
}

// ─── useDeliveries ────────────────────────────────────────────────────────────

export function useDeliveries(salesOrderId?: string) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? null;

  const fetch = useCallback(async () => {
    if (!companyId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    let q = (supabase as any)
      .from("deliveries")
      .select("*, customer:customers(name, code), warehouse:warehouses(name), delivery_lines:delivery_lines(*)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    if (salesOrderId) q = q.eq("sales_order_id", salesOrderId);
    const { data } = await q;
    setItems(data || []);
    setLoading(false);
  }, [companyId, salesOrderId]);

  useEffect(() => { fetch(); }, [fetch]);

  const validateDelivery = async (
    deliveryId: string,
    deductStockFn: (productId: string, warehouseId: string, qty: number, refType: string, refId?: string) => Promise<boolean>,
    releaseReservationFn: (productId: string, warehouseId: string, qty: number) => Promise<void>,
  ) => {
    const { data: del } = await (supabase as any)
      .from("deliveries")
      .select("*, delivery_lines:delivery_lines(*)")
      .eq("id", deliveryId)
      .single();

    if (!del) return false;

    const userId = await getUserId();

    // Process each line: deduct stock + release reservation
    for (const l of (del.delivery_lines || [])) {
      if (!l.product_id || !del.warehouse_id) continue;
      await deductStockFn(l.product_id, del.warehouse_id, Number(l.quantity), "delivery", deliveryId);
      await releaseReservationFn(l.product_id, del.warehouse_id, Number(l.quantity));

      // Update SO line delivered qty
      if (l.sales_order_line_id) {
        const { data: sol } = await (supabase as any).from("sales_order_lines").select("delivered_qty").eq("id", l.sales_order_line_id).single();
        if (sol) {
          await (supabase as any).from("sales_order_lines").update({
            delivered_qty: Number(sol.delivered_qty || 0) + Number(l.quantity),
          }).eq("id", l.sales_order_line_id);
        }
      }
    }

    // Mark delivery as validated
    await (supabase as any).from("deliveries").update({
      status: "validated",
      validated_at: new Date().toISOString(),
      validated_by: userId,
    }).eq("id", deliveryId);

    // Update sales order status
    if (del.sales_order_id) {
      const { data: allLines } = await (supabase as any)
        .from("sales_order_lines")
        .select("quantity, delivered_qty")
        .eq("sales_order_id", del.sales_order_id);

      const fullyDelivered = (allLines || []).every((l: any) => Number(l.delivered_qty) >= Number(l.quantity));
      const partiallyDelivered = (allLines || []).some((l: any) => Number(l.delivered_qty) > 0);
      const newStatus = fullyDelivered ? "delivered" : partiallyDelivered ? "partially_delivered" : "confirmed";
      await (supabase as any).from("sales_orders").update({ status: newStatus }).eq("id", del.sales_order_id);
    }

    await auditLog("validate_delivery", "deliveries", deliveryId, `BL ${del.delivery_number} validé`);
    toast({ title: "Livraison validée — stock mis à jour" });
    await fetch();
    return true;
  };

  const cancelDelivery = async (deliveryId: string, reason?: string) => {
    const userId = await getUserId();
    await (supabase as any).from("deliveries").update({
      status: "cancelled",
      cancel_reason: reason || null,
      cancelled_at: new Date().toISOString(),
      cancelled_by: userId,
    }).eq("id", deliveryId);
    await auditLog("cancel_delivery", "deliveries", deliveryId, reason ? `Motif: ${reason}` : undefined);
    toast({ title: "Bon de livraison annulé" });
    await fetch();
  };

  const getDeliveryLines = async (deliveryId: string) => {
    const { data } = await (supabase as any)
      .from("delivery_lines")
      .select("*, product:products(name, code)")
      .eq("delivery_id", deliveryId)
      .order("sort_order");
    return data || [];
  };

  const updateDeliveryLine = async (lineId: string, qty: number) => {
    const { data: l } = await (supabase as any).from("delivery_lines").select("unit_price, discount_percent, tva_rate").eq("id", lineId).single();
    if (!l) return;
    const calc = calcLine({ quantity: qty, unit_price: l.unit_price, discount_percent: l.discount_percent, tva_rate: l.tva_rate });
    await (supabase as any).from("delivery_lines").update({
      quantity: qty,
      total_ht: calc.total_ht,
      total_tva: calc.total_tva,
      total_ttc: calc.total_ttc,
    }).eq("id", lineId);
  };

  return { items, loading, fetch, validateDelivery, cancelDelivery, getDeliveryLines, updateDeliveryLine };
}
