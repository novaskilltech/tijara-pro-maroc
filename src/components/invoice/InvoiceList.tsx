import { formatCurrency } from "@/lib/format-currency";
import { useState, useEffect, useCallback } from "react";
import { useInvoices } from "@/hooks/useInvoices";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InvoiceFormDialog } from "./InvoiceFormDialog";
import { InvoiceDetailDialog } from "./InvoiceDetailDialog";
import { INVOICE_STATUS_LABELS, type Invoice, type InvoiceLine } from "@/types/invoice";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Loader2, Eye, Pencil, Trash2 } from "lucide-react";
import { printInvoicePdf } from "@/lib/pdf";
import { PrintButton } from "@/components/PrintButton";
import { INVOICE_STATUS, getStatus } from "@/lib/status-config";
import { AdvancedSearch, applyAdvancedSearch, type SearchOperator, type SearchableField, type FilterOption, type QuickFilter } from "@/components/AdvancedSearch";

const INV_SEARCH_FIELDS: SearchableField[] = [
  { key: "invoice_number", label: "N° Facture" },
  { key: "_party_name", label: "Client / Fournisseur" },
];

const INV_FILTERS: FilterOption[] = [
  {
    key: "status", label: "Statut", type: "select",
    options: [
      { value: "draft", label: "Brouillon" },
      { value: "validated", label: "Validée" },
      { value: "paid", label: "Payée" },
      { value: "cancelled", label: "Annulée" },
    ],
  },
];

const INV_QUICK_FILTERS: QuickFilter[] = [
  { label: "Brouillons", filters: { status: "draft" } },
  { label: "Validées", filters: { status: "validated" } },
  { label: "Payées", filters: { status: "paid" } },
];

interface InvoiceListProps {
  invoiceType: "client" | "supplier";
  onCreateCreditNote: (invoice: Invoice) => void;
}

export function InvoiceList({ invoiceType, onCreateCreditNote }: InvoiceListProps) {
  const { invoices, loading, create, updateInvoice, updateLines, fetchLines, validateInvoice, cancelInvoice, markPaid, remove } = useInvoices(invoiceType);
  const { isAdmin, hasRole } = useAuth();
  const { activeCompany } = useCompany();
  const { settings: companySettings } = useCompanySettings();
  const canManage = isAdmin() || hasRole("accountant");

  const [searchState, setSearchState] = useState<{
    query: string; operator: SearchOperator; activeFilters: Record<string, string>;
  }>({ query: "", operator: "contains", activeFilters: {} });

  const [formOpen, setFormOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [editLines, setEditLines] = useState<Partial<InvoiceLine>[]>([]);
  const [detailInvoice, setDetailInvoice] = useState<Invoice | null>(null);
  const [detailLines, setDetailLines] = useState<InvoiceLine[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    if (!activeCompany?.id) { setProducts([]); return; }
    supabase.from("products").select("id, code, name, sale_price, purchase_price, tva_rate").eq("is_active", true).eq("company_id", activeCompany.id).then(({ data }) => {
      setProducts(data || []);
    });
  }, [activeCompany?.id]);

  // Augment invoices with a searchable party name
  const augmented = invoices.map((inv) => ({
    ...inv,
    _party_name: inv.customer?.name || inv.supplier?.name || "",
  }));

  const filtered = applyAdvancedSearch(
    augmented,
    INV_SEARCH_FIELDS.map((f) => f.key),
    searchState.query,
    searchState.operator,
    searchState.activeFilters,
  );

  const handleSearch = useCallback((state: typeof searchState) => { setSearchState(state); }, []);

  const openDetail = async (inv: Invoice) => {
    const lines = await fetchLines(inv.id);
    setDetailInvoice(inv);
    setDetailLines(lines);
  };

  const openEdit = async (inv: Invoice) => {
    const lines = await fetchLines(inv.id);
    setEditInvoice(inv);
    setEditLines(lines);
    setFormOpen(true);
  };

  const handlePrint = async (inv: Invoice, download = false) => {
    const lines = await fetchLines(inv.id);
    await printInvoicePdf(inv.id, inv, lines, activeCompany?.id, download);
  };

  const handleSubmit = async (invoice: Partial<Invoice>, lines: Partial<InvoiceLine>[]) => {
    if (editInvoice) {
      await updateInvoice(editInvoice.id, invoice);
      await updateLines(editInvoice.id, lines);
      setEditInvoice(null);
    } else {
      await create(invoice, lines);
    }
  };

  const statusCfg = (s: string) => getStatus(INVOICE_STATUS, s);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-end">
          {canManage && (
            <Button onClick={() => { setEditInvoice(null); setEditLines([]); setFormOpen(true); }} className="gap-1">
              <Plus className="h-4 w-4" /> Nouvelle facture
            </Button>
          )}
        </div>
        <AdvancedSearch
          searchFields={INV_SEARCH_FIELDS}
          filters={INV_FILTERS}
          quickFilters={INV_QUICK_FILTERS}
          onSearch={handleSearch}
          placeholder="Rechercher par numéro, client, fournisseur..."
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">Aucune facture trouvée</div>
      ) : (
        <div className="bg-card rounded-lg border shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Facture</TableHead>
                <TableHead>{invoiceType === "client" ? "Client" : "Fournisseur"}</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Total TTC</TableHead>
                <TableHead className="text-right">Solde</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inv) => (
                <TableRow key={inv.id} className="cursor-pointer" onClick={() => openDetail(inv)}>
                  <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                  <TableCell>{inv.customer?.name || inv.supplier?.name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{inv.invoice_date}</TableCell>
                  <TableCell><Badge className={`${statusCfg(inv.status).className} border-0`}>{INVOICE_STATUS_LABELS[inv.status]}</Badge></TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(inv.total_ttc)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatCurrency(inv.remaining_balance)}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Voir" onClick={() => openDetail(inv)}><Eye className="h-4 w-4" /></Button>
                      <PrintButton
                        iconOnly
                        onPrint={() => handlePrint(inv, false)}
                        onDownload={() => handlePrint(inv, true)}
                      />
                      {inv.status === "draft" && canManage && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Modifier" onClick={() => openEdit(inv)}><Pencil className="h-4 w-4" /></Button>
                      )}
                      {inv.status === "draft" && isAdmin() && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Supprimer" onClick={() => remove(inv.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <InvoiceFormDialog
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditInvoice(null); }}
        invoiceType={invoiceType}
        onSubmit={handleSubmit}
        editInvoice={editInvoice}
        editLines={editLines}
      />

      <InvoiceDetailDialog
        invoice={detailInvoice}
        lines={detailLines}
        products={products}
        onClose={() => setDetailInvoice(null)}
        onValidate={validateInvoice}
        onCancel={cancelInvoice}
        onMarkPaid={markPaid}
        onCreateCreditNote={onCreateCreditNote}
      />
    </div>
  );
}
