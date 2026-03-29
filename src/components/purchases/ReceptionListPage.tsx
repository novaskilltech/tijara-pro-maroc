import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, X, FileText } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { usePurchaseOrders } from "@/hooks/usePurchases";
import { useCompany } from "@/hooks/useCompany";
import { RECEPTION_STATUS, getStatus } from "@/lib/status-config";

interface Props { hook: any; onNew?: () => void; onView?: (id: string) => void; }

export function ReceptionListPage({ hook, onNew, onView }: Props) {
  const { roles } = useAuth();
  const { activeCompany } = useCompany();
  const poHook = usePurchaseOrders();
  const isAdmin = roles.some(r => ["super_admin", "admin"].includes(r));
  const [cancelDialog, setCancelDialog] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const confirmCancel = async () => {
    if (!cancelDialog || !reason.trim()) return;
    await hook.cancel(cancelDialog, reason);
    setCancelDialog(null);
    setReason("");
  };

  const handleCreateInvoice = async (receptionId: string) => {
    await poHook.createInvoiceFromReception(receptionId);
    await hook.fetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Réceptions</h2>
        {onNew && (
          <Button size="sm" onClick={onNew} className="gap-1.5">
            <span>+ Nouvelle réception</span>
          </Button>
        )}
      </div>

      {hook.loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : hook.items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Aucune réception. Créez-en depuis un bon de commande confirmé.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Réception</TableHead>
                <TableHead>BC Source</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Dépôt</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hook.items.map((item: any) => {
                const cfg = getStatus(RECEPTION_STATUS, item.status);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm font-medium">{item.number}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{item.order?.order_number || "—"}</TableCell>
                    <TableCell>{item.supplier?.name || "—"}</TableCell>
                    <TableCell>{item.warehouse?.name || "—"}</TableCell>
                    <TableCell>{item.date || item.reception_date}</TableCell>
                    <TableCell><Badge className={`${cfg.className} border-0`}>{cfg.label}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {item.status === "validated" && !item.invoice_id && (
                          <Button size="sm" variant="outline" className="border-primary/40 text-primary" onClick={() => handleCreateInvoice(item.id)}>
                            <FileText className="h-3 w-3 mr-1" /> Facturer
                          </Button>
                        )}
                        {item.invoice_id && <Badge variant="outline" className="text-xs">Facturé</Badge>}
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

      <AlertDialog open={!!cancelDialog} onOpenChange={() => { setCancelDialog(null); setReason(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler la réception</AlertDialogTitle>
            <AlertDialogDescription>Un motif est requis.</AlertDialogDescription>
          </AlertDialogHeader>
          <Input placeholder="Motif d'annulation..." value={reason} onChange={e => setReason(e.target.value)} />
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel} disabled={!reason.trim()}>Annuler</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
