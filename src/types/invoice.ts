export interface Invoice {
  id: string;
  invoice_number: string;
  invoice_type: "client" | "supplier";
  status: "draft" | "validated" | "cancelled" | "paid";
  invoice_date: string;
  due_date: string | null;
  customer_id: string | null;
  supplier_id: string | null;
  payment_terms: string;
  subtotal_ht: number;
  total_tva: number;
  total_ttc: number;
  remaining_balance: number;
  quotation_id?: string | null;
  warehouse_id?: string | null;
  stock_deducted?: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  customer?: { name: string; ice: string | null; email?: string | null; phone?: string | null; address?: string | null } | null;
  supplier?: { name: string; ice: string | null; email?: string | null; phone?: string | null; address?: string | null } | null;
}

export interface InvoiceLine {
  id: string;
  invoice_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tva_rate: number;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  sort_order: number;
}

export interface CreditNote {
  id: string;
  credit_note_number: string;
  credit_note_type: "client" | "supplier";
  status: "draft" | "validated" | "cancelled";
  credit_note_date: string;
  invoice_id: string | null;
  customer_id: string | null;
  supplier_id: string | null;
  company_id: string | null;
  reason: string;
  subtotal_ht: number;
  total_tva: number;
  total_ttc: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  customer?: { name: string } | null;
  supplier?: { name: string } | null;
  company?: { name: string } | null;
  invoice?: { invoice_number: string } | null;
}

export interface CreditNoteLine {
  id: string;
  credit_note_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  tva_rate: number;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  sort_order: number;
}

export interface InvoiceAttachment {
  id: string;
  invoice_id: string | null;
  credit_note_id: string | null;
  file_name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export function calcLineTotals(qty: number, unitPrice: number, discountPct: number = 0, tvaRate: number = 0) {
  const baseHt = qty * unitPrice;
  const discountAmount = baseHt * (discountPct / 100);
  const total_ht = baseHt - discountAmount;
  const total_tva = total_ht * (tvaRate / 100);
  const total_ttc = total_ht + total_tva;
  return {
    total_ht: Math.round((total_ht + Number.EPSILON) * 100) / 100,
    total_tva: Math.round((total_tva + Number.EPSILON) * 100) / 100,
    total_ttc: Math.round((total_ttc + Number.EPSILON) * 100) / 100,
  };
}

export const INVOICE_STATUS_LABELS: Record<Invoice["status"], string> = {
  draft: "Brouillon",
  validated: "Validée",
  cancelled: "Annulée",
  paid: "Payée",
};

export const CREDIT_NOTE_STATUS_LABELS: Record<CreditNote["status"], string> = {
  draft: "Brouillon",
  validated: "Validé",
  cancelled: "Annulé",
};
