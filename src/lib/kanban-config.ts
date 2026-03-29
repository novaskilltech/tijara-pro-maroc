/**
 * Kanban configuration for each document module.
 * Defines columns, card mapping, and allowed transitions.
 */

import type { KanbanColumn, KanbanCard, KanbanTransition } from "@/components/KanbanBoard";

// ─── Quotations ───────────────────────────────────────────────────────

export const QUOTATION_KANBAN_COLUMNS: KanbanColumn[] = [
  { id: "draft", label: "Brouillon", className: "bg-muted text-muted-foreground" },
  { id: "sent", label: "Envoyé", className: "bg-secondary/20 text-secondary-foreground" },
  { id: "confirmed", label: "Confirmé", className: "bg-success/15 text-success" },
  { id: "expired", label: "Expiré", className: "bg-warning/15 text-warning-foreground" },
  { id: "cancelled", label: "Annulé", className: "bg-destructive/10 text-destructive" },
];

export function getQuotationTransitions(
  markSent: (id: string) => Promise<any>,
  confirm: (id: string) => Promise<any>,
  cancel: (id: string, reason?: string) => Promise<any>,
): KanbanTransition[] {
  return [
    { from: "draft", to: "sent", action: async (id) => { await markSent(id); } },
    { from: "sent", to: "confirmed", requiresAdmin: true, action: async (id) => { await confirm(id); } },
    { from: "draft", to: "cancelled", requiresReason: true, action: async (id, r) => { await cancel(id, r); } },
    { from: "sent", to: "cancelled", requiresReason: true, action: async (id, r) => { await cancel(id, r); } },
    { from: "confirmed", to: "cancelled", requiresAdmin: true, requiresReason: true, action: async (id, r) => { await cancel(id, r); } },
  ];
}

export function mapQuotationCard(item: any): KanbanCard {
  const badges: KanbanCard["badges"] = [];
  if (item.validity_date && new Date(item.validity_date) < new Date() && item.status !== "cancelled") {
    badges.push({ label: "Expiré", className: "bg-warning/20 text-warning-foreground border-warning/30" });
  }
  return {
    id: item.id,
    status: item.status === "draft" && item.validity_date && new Date(item.validity_date) < new Date() ? "expired" : item.status,
    title: item.number || item.quotation_number,
    subtitle: item.customer?.name,
    amount: Number(item.total_ttc || 0),
    date: item.date || item.quotation_date,
    dueDate: item.validity_date || undefined,
    badges,
  };
}

// ─── Sales Orders ─────────────────────────────────────────────────────

export const ORDER_KANBAN_COLUMNS: KanbanColumn[] = [
  { id: "draft", label: "Brouillon", className: "bg-muted text-muted-foreground" },
  { id: "confirmed", label: "Confirmé", className: "bg-primary/15 text-primary" },
  { id: "partially_delivered", label: "Partiellement livré", className: "bg-warning/15 text-warning-foreground" },
  { id: "delivered", label: "Livré", className: "bg-success/15 text-success" },
  { id: "invoiced", label: "Facturé", className: "bg-accent text-accent-foreground" },
  { id: "cancelled", label: "Annulé", className: "bg-destructive/10 text-destructive" },
];

export function getOrderTransitions(
  confirm: (id: string, reserveStockFn: any) => Promise<any>,
  cancel: (id: string, releaseReservationFn: any, reason?: string) => Promise<any>,
  reserveStock: any,
  releaseReservation: any,
): KanbanTransition[] {
  return [
    { from: "draft", to: "confirmed", action: async (id) => { await confirm(id, reserveStock); } },
    { from: "draft", to: "cancelled", requiresReason: true, action: async (id, r) => { await cancel(id, releaseReservation, r); } },
    { from: "confirmed", to: "cancelled", requiresAdmin: true, requiresReason: true, action: async (id, r) => { await cancel(id, releaseReservation, r); } },
  ];
}

export function mapOrderCard(item: any): KanbanCard {
  return {
    id: item.id,
    status: item.status,
    title: item.number || item.order_number,
    subtitle: item.customer?.name,
    amount: Number(item.total_ttc || 0),
    date: item.date || item.order_date,
  };
}

// ─── Deliveries ───────────────────────────────────────────────────────

export const DELIVERY_KANBAN_COLUMNS: KanbanColumn[] = [
  { id: "draft", label: "Brouillon", className: "bg-muted text-muted-foreground" },
  { id: "validated", label: "Validé", className: "bg-success/15 text-success" },
  { id: "cancelled", label: "Annulé", className: "bg-destructive/10 text-destructive" },
];

export function getDeliveryTransitions(
  validateDelivery: (id: string, deductStock: any, releaseReservation: any) => Promise<any>,
  deductStock: any,
  releaseReservation: any,
): KanbanTransition[] {
  return [
    { from: "draft", to: "validated", requiresAdmin: true, action: async (id) => { await validateDelivery(id, deductStock, releaseReservation); } },
  ];
}

export function mapDeliveryCard(item: any): KanbanCard {
  return {
    id: item.id,
    status: item.status,
    title: item.delivery_number,
    subtitle: item.customer?.name,
    date: item.delivery_date,
    extra: item.warehouse?.name,
    badges: item.invoice_id ? [{ label: "Facturé", className: "bg-accent text-accent-foreground" }] : [],
  };
}

// ─── Receptions ───────────────────────────────────────────────────────

export const RECEPTION_KANBAN_COLUMNS: KanbanColumn[] = [
  { id: "draft", label: "Brouillon", className: "bg-muted text-muted-foreground" },
  { id: "validated", label: "Validée", className: "bg-success/15 text-success" },
  { id: "cancelled", label: "Annulée", className: "bg-destructive/10 text-destructive" },
];

export function mapReceptionCard(item: any): KanbanCard {
  return {
    id: item.id,
    status: item.status,
    title: item.number || item.reception_number,
    subtitle: item.supplier?.name,
    date: item.date || item.reception_date,
    extra: item.warehouse?.name,
    badges: item.invoice_id ? [{ label: "Facturé", className: "bg-accent text-accent-foreground" }] : [],
  };
}

// ─── Invoices ─────────────────────────────────────────────────────────

export const INVOICE_KANBAN_COLUMNS: KanbanColumn[] = [
  { id: "draft", label: "Brouillon", className: "bg-muted text-muted-foreground" },
  { id: "validated", label: "Validée", className: "bg-primary/15 text-primary" },
  { id: "overdue", label: "En retard", className: "bg-destructive/15 text-destructive" },
  { id: "paid", label: "Payée", className: "bg-success/15 text-success" },
  { id: "cancelled", label: "Annulée", className: "bg-destructive/10 text-destructive" },
];

export function getInvoiceTransitions(
  validate: (id: string) => Promise<any>,
  cancel: (id: string) => Promise<any>,
  markPaid: (id: string) => Promise<any>,
): KanbanTransition[] {
  return [
    { from: "draft", to: "validated", requiresAdmin: true, action: async (id) => { await validate(id); } },
    { from: "validated", to: "paid", requiresAdmin: true, action: async (id) => { await markPaid(id); } },
    { from: "overdue", to: "paid", requiresAdmin: true, action: async (id) => { await markPaid(id); } },
    { from: "draft", to: "cancelled", requiresReason: true, requiresAdmin: true, action: async (id) => { await cancel(id); } },
    { from: "validated", to: "cancelled", requiresReason: true, requiresAdmin: true, action: async (id) => { await cancel(id); } },
  ];
}

export function mapInvoiceCard(item: any, invoiceType: "client" | "supplier"): KanbanCard {
  const isOverdue = item.status === "validated" && item.due_date && new Date(item.due_date) < new Date() && Number(item.remaining_balance) > 0;
  const badges: KanbanCard["badges"] = [];
  if (isOverdue) badges.push({ label: "En retard", className: "bg-destructive/20 text-destructive" });
  if (Number(item.remaining_balance) > 0 && Number(item.remaining_balance) < Number(item.total_ttc) && item.status !== "draft") {
    badges.push({ label: "Partiel", className: "bg-warning/20 text-warning-foreground" });
  }

  return {
    id: item.id,
    status: isOverdue ? "overdue" : item.status,
    title: item.invoice_number,
    subtitle: invoiceType === "client" ? item.customer?.name : item.supplier?.name,
    amount: Number(item.total_ttc || 0),
    date: item.invoice_date,
    dueDate: item.due_date || undefined,
    extra: Number(item.remaining_balance) > 0 ? `Solde: ${Number(item.remaining_balance).toLocaleString("fr-MA")}` : undefined,
    badges,
  };
}

// ─── Payments (Cheques) ───────────────────────────────────────────────

export const PAYMENT_KANBAN_COLUMNS: KanbanColumn[] = [
  { id: "pending", label: "À encaisser", className: "bg-warning/15 text-warning-foreground" },
  { id: "deposited", label: "Déposé", className: "bg-primary/15 text-primary" },
  { id: "cleared", label: "Encaissé", className: "bg-success/15 text-success" },
  { id: "rejected", label: "Rejeté", className: "bg-destructive/10 text-destructive" },
];

export function mapPaymentCard(item: any, paymentType: "client" | "supplier"): KanbanCard {
  // Map cheque payments — for non-cheque show a simple status
  const status = item.cheque_date && new Date(item.cheque_date) > new Date() ? "pending" : "cleared";
  return {
    id: item.id,
    status: status,
    title: item.payment_number,
    subtitle: paymentType === "client" ? item.customer?.name : item.supplier?.name,
    amount: Number(item.amount || 0),
    date: item.payment_date,
    dueDate: item.cheque_date || item.lcn_due_date || undefined,
    extra: item.payment_method === "cheque" ? `Chèque: ${item.cheque_number || "—"}` : item.payment_method,
  };
}
