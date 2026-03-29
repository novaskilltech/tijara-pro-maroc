import { formatCurrency } from "@/lib/format-currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, Eye, Check, X, Package, FileText, Paperclip } from "lucide-react";
import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { ReceptionDialog } from "@/components/purchases/ReceptionDialog";
import { useStockEngine } from "@/hooks/useStockEngine";
import { PURCHASE_ORDER_STATUS, getStatus } from "@/lib/status-config";
import { AdvancedSearch, applyAdvancedSearch, type SearchOperator, type SearchableField, type FilterOption } from "@/components/AdvancedSearch";
import { DocAttachmentsDialog } from "@/components/DocAttachmentsDialog";
import { useCompany } from "@/hooks/useCompany";
import { PrintButton } from "@/components/PrintButton";
import { printPurchaseOrderPdf } from "@/lib/pdf";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const SEARCH_FIELDS: SearchableField[] = [
  { key: "number", label: "N° BC" },
  { key: "_supplier_name", label: "Fournisseur" },
  { key: "_warehouse_name", label: "Dépôt" },
];

const FILTERS: FilterOption[] = [
  {
    key: "status", label: "Statut", type: "select",
    options: [
      { value: "draft", label: "Brouillon" },
      { value: "confirmed", label: "Confirmée" },
      { value: "partially_received", label: "Partiellement reçue" },
      { value: "received", label: "Reçue" },
      { value: "invoiced", label: "Facturée" },
      { value: "cancelled", label: "Annulée" },
    ],
  },
];

interface Props {
  items: any[];
  loading: boolean;
  onNew: () => void;
  onEdit: (item: any) => void;
  onConfirm: (id: string) => void;
  onCancel: (id: string, reason: string) => void;
  onCreateReception: () => void;
  hook: any;
}

export function PurchaseOrderList({ items, loading, onNew, onEdit, onConfirm, onCancel, hook }: Props) {
  const { roles } = useAuth();
  const { activeCompany } = useCompany();
  const stock = useStockEngine();
  const navigate = useNavigate();
  const isAdmin = roles.some(r => ["super_admin", "admin"].includes(r));
  const [cancelDialog, setCancelDialog] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [receptionOrder, setReceptionOrder] = useState<any>(null);
  const [attachDialog, setAttachDialog] = useState<{ id: string; number: string } | null>(null);

  const [searchState, setSearchState] = useState<{
    query: string; operator: SearchOperator; activeFilters: Record<string, string>;
  }>({ query: "", operator: "contains", activeFilters: {} });

  const handleSearch = useCallback((state: typeof searchState) => { setSearchState(state); }, []);

  const confirmCancel = async () => {
    if (!cancelDialog || !reason.trim()) return;
    await onCancel(cancelDialog, reason);
    setCancelDialog(null);
    setReason("");
  };

  const canReceive = (s: string) => ["confirmed", "partially_received", "validated"].includes(s);
  const canInvoice = (s: string) => ["received", "partially_received"].includes(s);

  const handlePrint = async (item: any, download = false) => {
    const { data: lines } = await (supabase as any)
      .from("purchase_order_lines")
      .select("*, product:products(code,name,unit,tva_rate)")
      .eq("purchase_order_id", item.id)
      .order("sort_order");
    await printPurchaseOrderPdf(item, lines || [], activeCompany?.id, download);
  };

  const handleInvoice = async (item: any) => {
    // Find last validated reception for this order and invoice it
    const { data } = await (supabase as any)
      .from("receptions").select("id, invoice_id").eq("purchase_order_id", item.id).eq("status", "validated").is("invoice_id", null).order("created_at", { ascending: false }).limit(1);
    if (data && data[0]) {
      const inv = await hook.createInvoiceFromReception(data[0].id);
      if (inv) {
        toast({ title: "Facture générée", description: `La facture fournisseur N° ${inv.invoice_number} a été créée avec succès.` });
        navigate("/facturation/fournisseurs");
      }
    } else {
      toast({ title: "Aucune réception à facturer", description: "Toutes les réceptions sont déjà facturées ou inexistantes.", variant: "destructive" });
    }
  };

  // Augment items with searchable fields
  const augmented = items.map((item) => ({
    ...item,
    _supplier_name: item.supplier?.name || "",
    _warehouse_name: item.warehouse?.name || "",
  }));

  const filtered = applyAdvancedSearch(
    augmented,
    SEARCH_FIELDS.map((f) => f.key),
    searchState.query,
    searchState.operator,
    searchState.activeFilters,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Bons de commande fournisseurs</h2>
        <Button onClick={onNew} size="sm"><Plus className="h-4 w-4 mr-1" /> Nouveau BC</Button>
      </div>

      <AdvancedSearch
        searchFields={SEARCH_FIELDS}
        filters={FILTERS}
        onSearch={handleSearch}
        placeholder="Rechercher par N° BC, fournisseur, dépôt..."
      />

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Aucun bon de commande</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° BC</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Dépôt</TableHead>
                <TableHead className="text-right">Total TTC</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => {
                const cfg = getStatus(PURCHASE_ORDER_STATUS, item.status);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm font-medium">{item.number}</TableCell>
                    <TableCell>{item.supplier?.name || "—"}</TableCell>
                    <TableCell>{item.warehouse?.name || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(Number(item.total_ttc || 0))}</TableCell>
                    <TableCell><Badge className={`${cfg.className} border-0`}>{cfg.label}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        <PrintButton iconOnly onPrint={() => handlePrint(item)} onDownload={() => handlePrint(item, true)} />

                        <Button
                          size="sm" variant="ghost" className="h-8 w-8 p-0" title="Pièces jointes"
                          onClick={() => setAttachDialog({ id: item.id, number: item.number })}
                        >
                          <Paperclip className="h-3.5 w-3.5" />
                        </Button>

                        {item.status === "draft" && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => onEdit(item)}>Modifier</Button>
                            <Button size="sm" variant="outline" className="border-primary/50 text-primary" onClick={() => onConfirm(item.id)}>
                              <Check className="h-3 w-3 mr-1" /> Confirmer
                            </Button>
                          </>
                        )}
                        {canReceive(item.status) && (
                          <Button size="sm" variant="outline" onClick={() => setReceptionOrder(item)}>
                            <Package className="h-3 w-3 mr-1" /> Réceptionner
                          </Button>
                        )}
                        {canInvoice(item.status) && (
                          <Button size="sm" variant="outline" className="border-primary/40 text-primary" onClick={() => handleInvoice(item)}>
                            <FileText className="h-3 w-3 mr-1" /> Facturer
                          </Button>
                        )}
                        {item.status !== "cancelled" && isAdmin && (
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground" title="Annuler" onClick={() => setCancelDialog(item.id)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {receptionOrder && (
        <ReceptionDialog order={receptionOrder} hook={hook} stock={stock} onClose={() => setReceptionOrder(null)} />
      )}

      {attachDialog && (
        <DocAttachmentsDialog
          open={!!attachDialog}
          onClose={() => setAttachDialog(null)}
          docType="purchase_order"
          docId={attachDialog.id}
          docNumber={attachDialog.number}
          companyId={activeCompany?.id}
        />
      )}

      <AlertDialog open={!!cancelDialog} onOpenChange={() => { setCancelDialog(null); setReason(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler le BC</AlertDialogTitle>
            <AlertDialogDescription>Un motif est requis pour annuler un BC confirmé.</AlertDialogDescription>
          </AlertDialogHeader>
          <Input placeholder="Motif d'annulation..." value={reason} onChange={e => setReason(e.target.value)} />
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel} disabled={!reason.trim()}>Annuler le BC</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
