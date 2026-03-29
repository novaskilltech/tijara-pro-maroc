import type { Invoice, CreditNote } from "@/types/invoice";

export function exportToCsv(invoices: Invoice[], filename: string) {
  const headers = ["N° Facture", "Type", "Date", "Tiers", "Statut", "Total HT", "TVA", "Total TTC", "Solde"];
  const rows = invoices.map((inv) => [
    inv.invoice_number,
    inv.invoice_type === "client" ? "Client" : "Fournisseur",
    inv.invoice_date,
    inv.customer?.name || inv.supplier?.name || "",
    inv.status,
    inv.subtotal_ht.toFixed(2),
    inv.total_tva.toFixed(2),
    inv.total_ttc.toFixed(2),
    inv.remaining_balance.toFixed(2),
  ]);

  const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
