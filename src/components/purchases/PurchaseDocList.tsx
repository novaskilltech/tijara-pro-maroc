import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Check, X, Loader2, Paperclip, Eye } from "lucide-react";
import { useState } from "react";
import { DocAttachmentsDialog } from "@/components/DocAttachmentsDialog";
import { useCompany } from "@/hooks/useCompany";
import { printPurchaseOrderPdf } from "@/lib/pdf";
import { PrintButton } from "@/components/PrintButton";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  title: string;
  items: any[];
  loading: boolean;
  onCreate?: () => void;
  onValidate?: (id: string) => void;
  onCancel?: (id: string) => void;
  onAdminValidate?: (id: string) => void;
  docType: "request" | "order";
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_admin: "bg-warning/15 text-warning-foreground",
  validated: "bg-primary/15 text-primary",
  received: "bg-success/15 text-success",
  cancelled: "bg-destructive/10 text-destructive",
};
const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  pending_admin: "En attente admin",
  validated: "Validé",
  received: "Réceptionné",
  cancelled: "Annulé",
};

export function PurchaseDocList({ title, items, loading, onCreate, onValidate, onCancel, onAdminValidate, docType }: Props) {
  const [attachDialog, setAttachDialog] = useState<{ id: string; number: string } | null>(null);
  const { activeCompany } = useCompany();
  const { settings: companySettings } = useCompanySettings();

  const handlePrint = async (item: any, download = false) => {
    if (docType !== "order") return;
    const { data: lines } = await (supabase as any)
      .from("purchase_order_lines")
      .select("*, product:products(code,name,unit,tva_rate)")
      .eq("purchase_order_id", item.id)
      .order("sort_order");
    await printPurchaseOrderPdf(item, lines || [], activeCompany?.id, download);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {onCreate && <Button onClick={onCreate} size="sm"><Plus className="h-4 w-4 mr-1" /> Nouveau</Button>}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Aucun document</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N°</TableHead>
                <TableHead>{docType === "order" ? "Fournisseur" : "Demandeur"}</TableHead>
                <TableHead>Date</TableHead>
                {docType === "order" && <TableHead className="text-right">Total TTC</TableHead>}
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-sm">{item.number}</TableCell>
                  <TableCell>{item.supplier?.name || "—"}</TableCell>
                  <TableCell>{item.date}</TableCell>
                  {docType === "order" && <TableCell className="text-right font-medium">{Number(item.total_ttc || 0).toLocaleString("fr-MA")} MAD</TableCell>}
                  <TableCell>
                    <Badge className={statusColors[item.status] || ""}>{statusLabels[item.status] || item.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 flex-wrap">
                      {/* View */}
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Voir">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>

                      {/* Print (orders only) */}
                      {docType === "order" && (
                        <PrintButton iconOnly onPrint={() => handlePrint(item)} onDownload={() => handlePrint(item, true)} />
                      )}

                      {/* Attachments */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        title="Pièces jointes"
                        onClick={() => setAttachDialog({ id: item.id, number: item.number })}
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                      </Button>

                      {item.status === "draft" && onValidate && (
                        <Button size="sm" variant="outline" onClick={() => onValidate(item.id)}><Check className="h-3 w-3 mr-1" /> Valider</Button>
                      )}
                      {item.status === "draft" && onCancel && (
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Annuler" onClick={() => onCancel(item.id)}><X className="h-3 w-3" /></Button>
                      )}

                      {/* Pending admin */}
                      {item.status === "pending_admin" && onAdminValidate && (
                        <Button size="sm" variant="outline" className="border-warning/50 text-warning" onClick={() => onAdminValidate(item.id)}>
                          <Check className="h-3 w-3 mr-1" /> Approuver
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
          docType={docType === "order" ? "purchase_order" : "purchase_request"}
          docId={attachDialog.id}
          docNumber={attachDialog.number}
          companyId={activeCompany?.id}
        />
      )}
    </div>
  );
}
