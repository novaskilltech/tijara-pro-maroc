import { formatCurrency } from "@/lib/format-currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, Eye, Edit, Trash2, X, Paperclip } from "lucide-react";
import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { PurchaseRequestDetail } from "@/components/purchases/PurchaseRequestDetail";
import { PURCHASE_REQUEST_STATUS, getStatus } from "@/lib/status-config";
import { AdvancedSearch, applyAdvancedSearch, type SearchOperator, type SearchableField, type FilterOption } from "@/components/AdvancedSearch";
import { DocAttachmentsDialog } from "@/components/DocAttachmentsDialog";
import { useCompany } from "@/hooks/useCompany";
import { PrintButton } from "@/components/PrintButton";
import { printPurchaseRequestPdf } from "@/lib/pdf";

const SEARCH_FIELDS: SearchableField[] = [
  { key: "number", label: "Référence" },
  { key: "_supplier_name", label: "Fournisseur" },
];

const FILTERS: FilterOption[] = [
  {
    key: "status", label: "Statut", type: "select",
    options: [
      { value: "draft", label: "Brouillon" },
      { value: "submitted", label: "Soumise" },
      { value: "approved", label: "Approuvée" },
      { value: "confirmed", label: "Confirmée" },
      { value: "refused", label: "Refusée" },
      { value: "cancelled", label: "Annulée" },
    ],
  },
];

interface Props {
  items: any[];
  loading: boolean;
  onNew: () => void;
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
  onCancel: (id: string, reason?: string) => void;
  onCreatePO: (id: string) => Promise<any>;
  onSubmit: (id: string) => void;
  onApprove: (id: string) => void;
  onRefuse: (id: string, reason?: string) => void;
}

export function PurchaseRequestList({ items, loading, onNew, onEdit, onDelete, onCancel, onCreatePO, onSubmit, onApprove, onRefuse }: Props) {
  const { roles } = useAuth();
  const { activeCompany } = useCompany();
  const isAdmin = roles.some(r => ["super_admin", "admin"].includes(r));
  const [detail, setDetail] = useState<any>(null);
  const [actionDialog, setActionDialog] = useState<{ id: string; action: "refuse" | "cancel" | "delete" } | null>(null);
  const [reason, setReason] = useState("");
  const [creatingPO, setCreatingPO] = useState<string | null>(null);
  const [attachDialog, setAttachDialog] = useState<{ id: string; number: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [searchState, setSearchState] = useState<{
    query: string; operator: SearchOperator; activeFilters: Record<string, string>;
  }>({ query: "", operator: "contains", activeFilters: {} });

  const handleSearch = useCallback((state: typeof searchState) => { setSearchState(state); }, []);

  const handleCreatePO = async (id: string) => {
    setCreatingPO(id);
    await onCreatePO(id);
    setCreatingPO(null);
  };

  const confirmAction = async () => {
    if (!actionDialog) return;
    if (actionDialog.action === "refuse") await onRefuse(actionDialog.id, reason);
    else if (actionDialog.action === "cancel") await onCancel(actionDialog.id, reason);
    else if (actionDialog.action === "delete") onDelete(actionDialog.id);
    setActionDialog(null);
    setReason("");
  };

  const handlePrint = async (item: any, download = false) => {
    await printPurchaseRequestPdf(item, activeCompany?.id, download);
  };

  // Augment items with searchable supplier name
  const augmented = items.map((item) => ({ ...item, _supplier_name: item.supplier?.name || "" }));

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
        <h2 className="text-lg font-semibold text-foreground">Demandes d'achat</h2>
        <Button onClick={onNew} size="sm"><Plus className="h-4 w-4 mr-1" /> Nouvelle demande</Button>
      </div>

      <AdvancedSearch
        searchFields={SEARCH_FIELDS}
        filters={FILTERS}
        onSearch={handleSearch}
        placeholder="Rechercher par référence, fournisseur..."
      />

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Aucune demande d'achat</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Référence</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Réf. fournisseur</TableHead>
                <TableHead>Arrivée prévue</TableHead>
                <TableHead className="text-right">Montant TTC</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => {
                const cfg = getStatus(PURCHASE_REQUEST_STATUS, item.status);
                const isDraft = item.status === "draft";
                const isSubmitted = item.status === "submitted";
                const isApprovedOrValidated = ["approved", "validated"].includes(item.status);
                const isTerminal = ["refused", "cancelled"].includes(item.status);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm font-medium">{item.number}</TableCell>
                    <TableCell>{item.supplier?.name || <span className="text-muted-foreground text-xs">Non défini</span>}</TableCell>
                    <TableCell>{item.supplier_reference || "—"}</TableCell>
                    <TableCell>{item.needed_date || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(Number(item.total_ttc || 0))}</TableCell>
                    <TableCell><Badge className={`${cfg.className} border-0`}>{cfg.label}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Voir" onClick={() => setDetail(item)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>

                        <PrintButton iconOnly onPrint={() => handlePrint(item)} onDownload={() => handlePrint(item, true)} />

                        <Button
                          size="sm" variant="ghost" className="h-8 w-8 p-0" title="Pièces jointes"
                          onClick={() => setAttachDialog({ id: item.id, number: item.number })}
                        >
                          <Paperclip className="h-3.5 w-3.5" />
                        </Button>

                        {isDraft && (
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Modifier" onClick={() => onEdit(item)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        {isDraft && (
                          <Button size="sm" variant="outline" className="border-primary/50 text-primary text-xs" onClick={() => onSubmit(item.id)}>
                            Soumettre
                          </Button>
                        )}

                        {isSubmitted && isAdmin && (
                          <>
                            <Button size="sm" variant="outline" className="border-primary/40 text-primary text-xs" onClick={() => onApprove(item.id)}>
                              Approuver
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" title="Refuser" onClick={() => setActionDialog({ id: item.id, action: "refuse" })}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}

                        {isApprovedOrValidated && (
                          <Button size="sm" variant="outline" className="border-primary/50 text-primary text-xs" disabled={creatingPO === item.id} onClick={() => handleCreatePO(item.id)}>
                            {creatingPO === item.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            Créer BC Fournisseur
                          </Button>
                        )}

                        {isDraft && isAdmin && (
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" title="Supprimer" onClick={() => setActionDialog({ id: item.id, action: "delete" })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        {!isTerminal && !isDraft && isAdmin && (
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground" title="Annuler" onClick={() => setActionDialog({ id: item.id, action: "cancel" })}>
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

      {detail && (
        <PurchaseRequestDetail
          item={detail}
          onClose={() => setDetail(null)}
          onCreatePO={onCreatePO}
          onEdit={onEdit}
          onSubmit={(id) => { onSubmit(id); setDetail(null); }}
          onApprove={(id) => { onApprove(id); setDetail(null); }}
          onRefuse={(id, reason) => { onRefuse(id, reason); setDetail(null); }}
          onRefresh={() => setRefreshKey(k => k + 1)}
        />
      )}

      {attachDialog && (
        <DocAttachmentsDialog
          open={!!attachDialog}
          onClose={() => setAttachDialog(null)}
          docType="purchase_request"
          docId={attachDialog.id}
          docNumber={attachDialog.number}
          companyId={activeCompany?.id}
        />
      )}

      <AlertDialog open={!!actionDialog} onOpenChange={() => { setActionDialog(null); setReason(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionDialog?.action === "refuse" ? "Refuser la demande" : actionDialog?.action === "delete" ? "Supprimer la demande" : "Annuler la demande"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionDialog?.action === "delete"
                ? "Êtes-vous sûr de vouloir supprimer cette demande ? Cette action est irréversible."
                : "Indiquez un motif (optionnel)."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {actionDialog?.action !== "delete" && (
            <Input placeholder="Motif..." value={reason} onChange={e => setReason(e.target.value)} />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction} className={actionDialog?.action === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}>
              {actionDialog?.action === "refuse" ? "Refuser" : actionDialog?.action === "delete" ? "Supprimer" : "Annuler"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
