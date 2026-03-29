import { pdf } from "@react-pdf/renderer";
import React from "react";
import { TijaraProPDF } from "./TijaraProPDF";
import { BillingJournalPDF } from "./BillingJournalPDF";
import type { PdfDocumentData, PdfDocumentType, PdfCompany, PdfBankAccount, PdfParty, PdfLine } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { openPrintHtml } from "./print-html";
import { openPrintHtmlWithTemplate } from "./print-html-custom";

// Re-export types for convenience
export type { PdfDocumentData, PdfDocumentType, PdfCompany, PdfBankAccount, PdfParty, PdfLine };

// ─── Core: Print (opens native print dialog) ─────────────────────────────────

export async function generateAndOpenPdf(data: PdfDocumentData) {
  // Try custom template first, falls back to default internally
  try {
    await openPrintHtmlWithTemplate(data);
  } catch {
    openPrintHtml(data);
  }
}

export async function generateAndDownloadPdf(data: PdfDocumentData) {
  try {
    const blob = await pdf(<TijaraProPDF data={data} />).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.type}-${data.number}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (err) {
    console.error("PDF download failed:", err);
    throw err;
  }
}

// ─── Data fetchers ─────────────────────────────────────────────────────────────

export async function fetchCompany(companyId?: string | null): Promise<PdfCompany | null> {
  if (companyId) {
    const { data } = await (supabase as any)
      .from("companies")
      .select("*, legal_mentions")
      .eq("id", companyId)
      .maybeSingle();
    return data || null;
  }
  const { data } = await supabase
    .from("company_settings")
    .select("*, legal_mentions")
    .limit(1)
    .maybeSingle();
  return data || null;
}

export async function fetchDefaultBank(companyId?: string | null): Promise<PdfBankAccount | null> {
  if (!companyId) return null;
  const { data } = await (supabase as any)
    .from("bank_accounts")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_default", true)
    .maybeSingle();
  if (data) return data;
  // Fallback: first active account
  const { data: first } = await (supabase as any)
    .from("bank_accounts")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  return first || null;
}

// ─── Invoice PDF ──────────────────────────────────────────────────────────────

export async function printInvoicePdf(
  invoiceId: string,
  invoiceData: any,
  lines: any[],
  companyId?: string | null,
  download = false
) {
  const [company, bank] = await Promise.all([
    fetchCompany(companyId),
    fetchDefaultBank(companyId),
  ]);
  if (!company) return;

  const party: PdfParty = invoiceData.customer
    ? {
        name: invoiceData.customer.name,
        ice: invoiceData.customer.ice,
        address: invoiceData.customer.address,
        city: invoiceData.customer.city,
        phone: invoiceData.customer.phone,
        email: invoiceData.customer.email,
        rc: invoiceData.customer.rc,
      }
    : invoiceData.supplier
    ? {
        name: invoiceData.supplier.name,
        ice: invoiceData.supplier.ice,
        address: invoiceData.supplier.address,
        city: invoiceData.supplier.city,
        phone: invoiceData.supplier.phone,
        email: invoiceData.supplier.email,
        rc: invoiceData.supplier.rc,
      }
    : { name: "—" };

  const isSupplier = !!invoiceData.supplier;
  const type: PdfDocumentType = isSupplier ? "facture_fournisseur" : "facture_client";

  const data: PdfDocumentData = {
    type,
    number: invoiceData.invoice_number,
    date: invoiceData.invoice_date,
    dueDate: invoiceData.due_date,
    paymentTerms: invoiceData.payment_terms,
    party,
    lines: lines.map((l: any, i: number) => ({
      ref: l.product?.code || String(i + 1).padStart(3, "0"),
      description: l.description,
      quantity: Number(l.quantity),
      unit: l.product?.unit || "Unité",
      unit_price: Number(l.unit_price),
      discount_percent: Number(l.discount_percent || 0),
      tva_rate: Number(l.tva_rate),
      total_ht: Number(l.total_ht),
      total_ttc: Number(l.total_ttc),
    })),
    subtotalHt: Number(invoiceData.subtotal_ht),
    totalTva: Number(invoiceData.total_tva),
    totalTtc: Number(invoiceData.total_ttc),
    remainingBalance: Number(invoiceData.remaining_balance),
    amountPaid: Number(invoiceData.total_ttc) - Number(invoiceData.remaining_balance),
    notes: invoiceData.notes,
    company,
    bankAccount: bank,
  };

  if (download) await generateAndDownloadPdf(data);
  else await generateAndOpenPdf(data);
}

// ─── Quotation / Sales Order PDF ──────────────────────────────────────────────

export async function printSalesDocPdf(
  item: any,
  lines: any[],
  type: "devis" | "commande_client",
  companyId?: string | null,
  download = false
) {
  const [company, bank] = await Promise.all([
    fetchCompany(companyId),
    fetchDefaultBank(companyId),
  ]);
  if (!company) return;

  const data: PdfDocumentData = {
    type,
    number: item.number,
    date: item.date,
    dueDate: item.due_date,
    paymentTerms: item.payment_terms,
    originRef: item.origin_ref,
    party: {
      name: item.customer?.name || "—",
      ice: item.customer?.ice,
      address: item.customer?.address,
      city: item.customer?.city,
      phone: item.customer?.phone,
      email: item.customer?.email,
      rc: item.customer?.rc,
    },
    lines: lines.map((l: any, i: number) => ({
      ref: l.product?.code || String(i + 1).padStart(3, "0"),
      description: l.description,
      quantity: Number(l.quantity),
      unit: l.product?.unit || "Unité",
      unit_price: Number(l.unit_price),
      discount_percent: Number(l.discount_percent || 0),
      tva_rate: Number(l.tva_rate),
      total_ht: Number(l.total_ht),
      total_ttc: Number(l.total_ttc),
    })),
    subtotalHt: Number(item.subtotal_ht || 0),
    totalTva: Number(item.total_tva || 0),
    totalTtc: Number(item.total_ttc || 0),
    notes: item.notes,
    company,
    bankAccount: bank,
  };

  if (download) await generateAndDownloadPdf(data);
  else await generateAndOpenPdf(data);
}

// ─── Delivery / BL PDF ────────────────────────────────────────────────────────

export async function printDeliveryPdf(
  delivery: any,
  lines: any[],
  companyId?: string | null,
  download = false
) {
  const [company, bank] = await Promise.all([
    fetchCompany(companyId),
    fetchDefaultBank(companyId),
  ]);
  if (!company) return;

  const data: PdfDocumentData = {
    type: "bon_livraison",
    number: delivery.delivery_number,
    date: delivery.delivery_date,
    originRef: delivery.sales_order_id ? `CO-${delivery.sales_order_id?.slice(0, 8)}` : undefined,
    party: {
      name: delivery.customer?.name || "—",
      ice: delivery.customer?.ice,
      address: delivery.customer?.address,
      city: delivery.customer?.city,
      phone: delivery.customer?.phone,
      email: delivery.customer?.email,
    },
    deliveryAddress: [delivery.customer?.address, delivery.customer?.city]
      .filter(Boolean)
      .join(", ") || undefined,
    lines: lines.map((l: any, i: number) => ({
      ref: l.product?.code || String(i + 1).padStart(3, "0"),
      description: l.description,
      quantity: Number(l.quantity),
      unit: l.product?.unit || "Unité",
      unit_price: Number(l.unit_price || 0),
      discount_percent: Number(l.discount_percent || 0),
      tva_rate: Number(l.tva_rate || 0),
      total_ht: Number(l.total_ht || 0),
      total_ttc: Number(l.total_ttc || 0),
    })),
    subtotalHt: lines.reduce((s, l) => s + Number(l.total_ht || 0), 0),
    totalTva: lines.reduce((s, l) => s + (Number(l.total_ttc || 0) - Number(l.total_ht || 0)), 0),
    totalTtc: lines.reduce((s, l) => s + Number(l.total_ttc || 0), 0),
    notes: delivery.notes,
    company,
    bankAccount: bank,
  };

  if (download) await generateAndDownloadPdf(data);
  else await generateAndOpenPdf(data);
}

// ─── Purchase Order PDF ───────────────────────────────────────────────────────

export async function printPurchaseOrderPdf(
  order: any,
  lines: any[],
  companyId?: string | null,
  download = false
) {
  const [company, bank] = await Promise.all([
    fetchCompany(companyId),
    fetchDefaultBank(companyId),
  ]);
  if (!company) return;

  const data: PdfDocumentData = {
    type: "commande_fournisseur",
    number: order.number,
    date: order.date,
    paymentTerms: order.payment_terms,
    party: {
      name: order.supplier?.name || "—",
      ice: order.supplier?.ice,
      address: order.supplier?.address,
      city: order.supplier?.city,
      phone: order.supplier?.phone,
      email: order.supplier?.email,
      rc: order.supplier?.rc,
    },
    lines: lines.map((l: any, i: number) => ({
      ref: l.product?.code || String(i + 1).padStart(3, "0"),
      description: l.description,
      quantity: Number(l.quantity),
      unit: l.product?.unit || "Unité",
      unit_price: Number(l.unit_price),
      discount_percent: Number(l.discount_percent || 0),
      tva_rate: Number(l.tva_rate),
      total_ht: Number(l.total_ht),
      total_ttc: Number(l.total_ttc),
    })),
    subtotalHt: Number(order.subtotal_ht || 0),
    totalTva: Number(order.total_tva || 0),
    totalTtc: Number(order.total_ttc || 0),
    notes: order.notes,
    company,
    bankAccount: bank,
  };

  if (download) await generateAndDownloadPdf(data);
  else await generateAndOpenPdf(data);
}

// ─── Purchase Request PDF ─────────────────────────────────────────────────

export async function printPurchaseRequestPdf(
  request: any,
  companyId?: string | null,
  download = false
) {
  const [company, bank] = await Promise.all([
    fetchCompany(companyId),
    fetchDefaultBank(companyId),
  ]);
  if (!company) return;

  // Fetch lines
  const { data: lines } = await (supabase as any)
    .from("purchase_request_lines")
    .select("*, product:products(code,name,unit,tva_rate,purchase_price)")
    .eq("request_id", request.id)
    .order("sort_order");

  const requestLines = (lines || []).map((l: any, i: number) => {
    const qty = Number(l.quantity || 0);
    const price = Number(l.estimated_cost || l.product?.purchase_price || 0);
    const tva = Number(l.tva_rate || l.product?.tva_rate || 0);
    const ht = qty * price;
    const ttc = ht * (1 + tva / 100);
    return {
      ref: l.product?.code || String(i + 1).padStart(3, "0"),
      description: l.description || l.product?.name || "—",
      quantity: qty,
      unit: l.unit || l.product?.unit || "Unité",
      unit_price: price,
      discount_percent: 0,
      tva_rate: tva,
      total_ht: Math.round(ht * 100) / 100,
      total_ttc: Math.round(ttc * 100) / 100,
    };
  });

  const subtotalHt = requestLines.reduce((s: number, l: any) => s + l.total_ht, 0);
  const totalTtc = requestLines.reduce((s: number, l: any) => s + l.total_ttc, 0);

  const data: PdfDocumentData = {
    type: "commande_fournisseur",
    number: request.number || request.request_number || "DA",
    date: request.date || request.request_date || new Date().toISOString().split("T")[0],
    party: {
      name: request.supplier?.name || "—",
      ice: request.supplier?.ice,
      address: request.supplier?.address,
      city: request.supplier?.city,
      phone: request.supplier?.phone,
      email: request.supplier?.email,
      rc: request.supplier?.rc,
    },
    lines: requestLines,
    subtotalHt,
    totalTva: totalTtc - subtotalHt,
    totalTtc,
    notes: request.notes,
    company,
    bankAccount: bank,
  };

  if (download) await generateAndDownloadPdf(data);
  else await generateAndOpenPdf(data);
}

// ─── Reception PDF ────────────────────────────────────────────────────────────

export async function printReceptionPdf(
  reception: any,
  lines: any[],
  companyId?: string | null,
  download = false
) {
  const [company] = await Promise.all([
    fetchCompany(companyId),
  ]);
  if (!company) return;

  const data: PdfDocumentData = {
    type: "reception",
    number: reception.reception_number || reception.number || "—",
    date: reception.reception_date || reception.date || new Date().toISOString().split("T")[0],
    originRef: reception.origin_ref,
    party: {
      name: reception.supplier?.name || "—",
      ice: reception.supplier?.ice,
      address: reception.supplier?.address,
      city: reception.supplier?.city,
      phone: reception.supplier?.phone,
      email: reception.supplier?.email,
    },
    lines: lines.map((l: any, i: number) => ({
      ref: l.product?.code || String(i + 1).padStart(3, "0"),
      description: l.product?.name || l.description || "—",
      quantity: Number(l.quantity_received ?? l.quantity_demanded ?? 0),
      unit: l.product?.unit || "Unité",
      unit_price: Number(l.product?.purchase_price || 0),
      tva_rate: Number(l.product?.tva_rate || 0),
      total_ht: 0,
      total_ttc: 0,
    })),
    subtotalHt: 0,
    totalTva: 0,
    totalTtc: 0,
    notes: reception.notes,
    company,
  };

  if (download) await generateAndDownloadPdf(data);
  else await generateAndOpenPdf(data);
}

// ─── Credit Note (Avoir) PDF ──────────────────────────────────────────────────

export async function printCreditNotePdf(
  creditNote: any,
  lines: any[],
  companyId?: string | null,
  download = false
) {
  const [company, bank] = await Promise.all([
    fetchCompany(companyId),
    fetchDefaultBank(companyId),
  ]);
  if (!company) return;

  const isSupplier = !!creditNote.supplier_id;
  const type: PdfDocumentType = isSupplier ? "avoir_fournisseur" : "avoir_client";

  const data: PdfDocumentData = {
    type,
    number: creditNote.credit_note_number,
    date: creditNote.credit_note_date,
    originRef: creditNote.invoice_id ? `Facture liée` : undefined,
    party: {
      name: creditNote.customer?.name || creditNote.supplier?.name || "—",
      ice: creditNote.customer?.ice || creditNote.supplier?.ice,
      address: creditNote.customer?.address || creditNote.supplier?.address,
      city: creditNote.customer?.city || creditNote.supplier?.city,
      phone: creditNote.customer?.phone || creditNote.supplier?.phone,
      email: creditNote.customer?.email || creditNote.supplier?.email,
    },
    lines: lines.map((l: any, i: number) => ({
      ref: String(i + 1).padStart(3, "0"),
      description: l.description,
      quantity: Number(l.quantity),
      unit_price: Number(l.unit_price),
      tva_rate: Number(l.tva_rate),
      total_ht: Number(l.total_ht),
      total_ttc: Number(l.total_ttc),
    })),
    subtotalHt: Number(creditNote.subtotal_ht),
    totalTva: Number(creditNote.total_tva),
    totalTtc: Number(creditNote.total_ttc),
    notes: creditNote.reason,
    company,
    bankAccount: bank,
  };

  if (download) await generateAndDownloadPdf(data);
  else await generateAndOpenPdf(data);
}

export async function printJournalPdf(
  invoices: any[],
  type: "journal_ventes" | "journal_achats",
  period: { from: string; to: string },
  companyId?: string | null
) {
  const company = await fetchCompany(companyId);
  if (!company) return;

  const blob = await pdf(
    <BillingJournalPDF 
      type={type} 
      company={company} 
      period={period} 
      items={invoices} 
    />
  ).toBlob();

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${type}_${period.from}_${period.to}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
