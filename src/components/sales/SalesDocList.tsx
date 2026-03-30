import { formatCurrency } from "@/lib/format-currency";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Check, X, ArrowRight, Loader2, Paperclip, Eye, Send } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { DocAttachmentsDialog } from "@/components/DocAttachmentsDialog";
import { useCompany } from "@/hooks/useCompany";
import { printSalesDocPdf } from "@/lib/pdf";
import { PrintButton } from "@/components/PrintButton";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import {
  QUOTATION_STATUS_LABELS, QUOTATION_STATUS_COLORS,
  ORDER_STATUS_LABELS, ORDER_STATUS_COLORS,
  calcTotals,
} from "@/hooks/useSales";
import { AdvancedSearch, applyAdvancedSearch, type SearchOperator, type SearchableField, type FilterOption, type QuickFilter } from "@/components/AdvancedSearch";
import { emailService } from "@/services/emailService";
import { fetchCompany, fetchDefaultBank } from "@/lib/pdf/index";
import { Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const SALES_SEARCH_FIELDS: SearchableField[] = [
  { key: "number", label: "N°" },
  { key: "_customer_name", label: "Client" },
];

const SALES_FILTERS: FilterOption[] = [
  {
    key: "status", label: "Statut", type: "select",
    options: [
      { value: "draft", label: "Brouillon" },
      { value: "sent", label: "Envoyé" },
      { value: "confirmed", label: "Confirmé" },
      { value: "cancelled", label: "Annulé" },
    ],
  },
];

interface Props {
  title: string;
  items: any[];
  loading: boolean;
  onCreate?: () => void;
  onView?: (id: string) => void;
  onValidate?: (id: string) => void;
  onCancel?: (id: string) => void;
  onConvert?: (id: string, warehouseId: string) => void;
  onConvertToDelivery?: (id: string, warehouseId: string) => void;
  onConvertToInvoice?: (id: string) => void;
  onConvertFull?: (id: string, warehouseId: string) => void;
  onAdminValidate?: (id: string) => void;
  docType: "quotation" | "order";
}

export function SalesDocList({
  title, items, loading, onCreate, onView,
  onValidate, onCancel, onConvert, onConvertToDelivery, onConvertToInvoice, onConvertFull, onAdminValidate, docType,
}: Props) {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWh, setSelectedWh] = useState<string>("");
  const [attachDialog, setAttachDialog] = useState<{ id: string; number: string } | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const { activeCompany } = useCompany();
  const { settings: companySettings } = useCompanySettings();

  const [searchState, setSearchState] = useState<{
    query: string; operator: SearchOperator; activeFilters: Record<string, string>;
  }>({ query: "", operator: "contains", activeFilters: {} });

  useEffect(() => {
    if (!activeCompany?.id) return;
    (supabase as any).from("warehouses").select("id, name").eq("is_active", true).eq("company_id", activeCompany.id).then(({ data }: any) => {
      setWarehouses(data || []);
      if (data?.length) setSelectedWh(data[0].id);
    });
  }, [activeCompany?.id]);

  const handlePrint = async (item: any, download = false) => {
    const { data: lines } = await (supabase as any)
      .from(docType === "quotation" ? "quotation_lines" : "sales_order_lines")
      .select("*, product:products(code,name,unit,tva_rate)")
      .eq(docType === "quotation" ? "quotation_id" : "sales_order_id", item.id)
      .order("sort_order");
    await printSalesDocPdf(item, lines || [], docType === "quotation" ? "devis" : "commande_client", activeCompany?.id, download);
  };

  const handleSendEmail = async (item: any) => {
    if (!item.customer?.email) {
      toast({
        title: "Email manquant",
        description: "Le client n'a pas d'adresse email configurée.",
        variant: "destructive",
      });
      return;
    }

    setSendingEmailId(item.id);
    try {
      const { data: lines } = await (supabase as any)
        .from(docType === "quotation" ? "quotation_lines" : "sales_order_lines")
        .select("*, product:products(code,name,unit,tva_rate)")
        .eq(docType === "quotation" ? "quotation_id" : "sales_order_id", item.id)
        .order("sort_order");

      const [company, bank] = await Promise.all([
        fetchCompany(activeCompany?.id),
        fetchDefaultBank(activeCompany?.id),
      ]);

      if (!company) throw new Error("Company data not found");

      const data = {
        type: (docType === "quotation" ? "devis" : "commande_client") as any,
        number: item.number,
        date: item.date,
        dueDate: item.validity_date || item.due_date,
        paymentTerms: item.payment_terms,
        party: {
          name: item.customer.name,
          email: item.customer.email,
          phone: item.customer.phone,
          address: item.customer.address,
        },
        lines: (lines || []).map(l => ({
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          discount_percent: l.discount_percent,
          tva_rate: l.tva_rate,
          total_ht: l.total_ht,
          total_ttc: l.total_ttc,
        })),
        subtotalHt: Number(item.subtotal_ht || 0),
        totalTva: Number(item.total_tva || 0),
        totalTtc: Number(item.total_ttc || 0),
        notes: item.notes,
        company,
        bankAccount: bank,
      };

      await emailService.sendDocument(data, item.customer.email);
    } catch (err) {
      console.error("Email send error:", err);
    } finally {
      setSendingEmailId(null);
    }
  };

  const statusLabels = docType === "quotation" ? QUOTATION_STATUS_LABELS : ORDER_STATUS_LABELS;
  const statusColors = docType === "quotation" ? QUOTATION_STATUS_COLORS : ORDER_STATUS_COLORS;

  const handleSearch = useCallback((state: typeof searchState) => { setSearchState(state); }, []);

  // Augment items with searchable customer name
  const augmented = items.map((item) => ({ ...item, _customer_name: item.customer?.name || "" }));

  const filtered = applyAdvancedSearch(
    augmented,
    SALES_SEARCH_FIELDS.map((f) => f.key),
    searchState.query,
    searchState.operator,
    searchState.activeFilters,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {onCreate && (
          <Button onClick={onCreate} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Nouveau
          </Button>
        )}
      </div>

      <AdvancedSearch
        searchFields={SALES_SEARCH_FIELDS}
        filters={SALES_FILTERS}
        onSearch={handleSearch}
        placeholder="Rechercher par numéro, client..."
      />

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">{docType === "quotation" ? "Aucun Devis" : "Aucun document"}</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N°</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total TTC</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-sm font-medium">{item.number}</TableCell>
                  <TableCell>{item.customer?.name || "—"}</TableCell>
                  <TableCell>{item.date}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(Number(item.total_ttc || 0))}
                  </TableCell>
                  <TableCell>
                    <Badge className={`${statusColors[item.status] || "bg-muted text-muted-foreground"} border text-xs`}>
                      {statusLabels[item.status] || item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 flex-wrap">
                      {onView && (
                        <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => onView(item.id)}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> Ouvrir
                        </Button>
                      )}
                      <PrintButton iconOnly onPrint={() => handlePrint(item)} onDownload={() => handlePrint(item, true)} />
                      <Button
                        size="sm" variant="ghost" className="h-8 w-8 p-0" title="Pièces jointes"
                        onClick={() => setAttachDialog({ id: item.id, number: item.number })}
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                      </Button>
                      {docType === "quotation" && item.status === "draft" && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onValidate?.(item.id)}>
                            <Check className="h-3 w-3 mr-1" /> Valider
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleSendEmail(item)} disabled={sendingEmailId === item.id}>
                            {sendingEmailId === item.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Mail className="h-3 w-3 mr-1" />}
                            Email
                          </Button>
                        </div>
                      )}
                      {item.status !== "draft" && (
                        <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => handleSendEmail(item)} disabled={sendingEmailId === item.id}>
                          {sendingEmailId === item.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Mail className="h-3.5 w-3.5 mr-1" />}
                          Email
                        </Button>
                      )}
                      {docType === "quotation" && item.status === "sent" && onValidate && (
                        <Button size="sm" variant="outline" className="h-8 text-xs border-success/50 text-success" onClick={() => onValidate(item.id)}>
                          <Check className="h-3 w-3 mr-1" /> Confirmer
                        </Button>
                      )}
                      {item.status === "pending_admin" && onAdminValidate && (
                        <Button size="sm" variant="outline" className="h-8 text-xs border-warning/50 text-warning-foreground" onClick={() => onAdminValidate(item.id)}>
                          <Check className="h-3 w-3 mr-1" /> Approuver
                        </Button>
                      )}
                      {docType === "order" && item.status === "draft" && onValidate && (
                        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onValidate(item.id)}>
                          <Check className="h-3 w-3 mr-1" /> Confirmer
                        </Button>
                      )}
                      {item.status === "confirmed" && docType === "quotation" && (
                        <div className="flex items-center gap-1">
                          <Select value={selectedWh} onValueChange={setSelectedWh}>
                            <SelectTrigger className="h-8 w-24 text-xs bg-background/50"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                            </SelectContent>
                          </Select>

                          <div className="flex items-center border rounded-md overflow-hidden bg-primary text-primary-foreground shadow-sm">
                            {onConvertToDelivery && (
                              <Button
                                size="sm"
                                className="h-8 px-2 text-xs rounded-none border-r border-primary-foreground/20 hover:bg-primary/90"
                                variant="ghost"
                                onClick={() => onConvertToDelivery(item.id, selectedWh)}
                                title="Convertir en Bon de Livraison"
                              >
                                <ArrowRight className="h-3 w-3 mr-1" /> Créer BL
                              </Button>
                            )}
                            {onConvertToInvoice && (
                              <Button
                                size="sm"
                                className="h-8 px-2 text-xs rounded-none border-r border-primary-foreground/20 hover:bg-primary/90"
                                variant="ghost"
                                onClick={() => onConvertToInvoice(item.id, selectedWh)}
                                title="Convertir en Facture"
                              >
                                <ArrowRight className="h-3 w-3 mr-1" /> Créer Facture
                              </Button>
                            )}
                            {onConvert && (
                              <Button
                                size="sm"
                                className="h-8 px-2 text-xs rounded-none border-r border-primary-foreground/20 hover:bg-primary/90"
                                variant="ghost"
                                onClick={() => onConvert(item.id, selectedWh)}
                                title="Convertir en Bon de Commande"
                              >
                                BC
                              </Button>
                            )}
                            {onConvertFull && (
                              <Button
                                size="sm"
                                className="h-8 px-2 text-xs rounded-none bg-emerald-600 hover:bg-emerald-700"
                                variant="ghost"
                                onClick={() => onConvertFull(item.id, selectedWh)}
                                title="Flux complet auto : BC + BL + Facture"
                              >
                                FULL
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                      {["draft", "sent", "confirmed"].includes(item.status) && onCancel && (
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" title="Annuler" onClick={() => onCancel(item.id)}>
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {attachDialog && (
        <DocAttachmentsDialog
          open={!!attachDialog}
          onClose={() => setAttachDialog(null)}
          docType={docType === "quotation" ? "quotation" : "sales_order"}
          docId={attachDialog.id}
          docNumber={attachDialog.number}
          companyId={activeCompany?.id}
        />
      )}
    </div>
  );
}
