import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import {
  SalesDoc, SalesDocLine, calcTotals, calcLine,
  ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, useDeliveries,
} from "@/hooks/useSales";
import { DocAttachmentsDialog } from "@/components/DocAttachmentsDialog";
import { useCompany } from "@/hooks/useCompany";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { generateDocumentPdf } from "@/lib/pdf-generator";
import {
  ArrowLeft, Check, X, Truck, FileText, Printer, Paperclip,
  Loader2, ChevronRight, Calendar, Building2, AlertTriangle,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { DeliveryMiniList } from "@/components/sales/DeliveryMiniList";

interface Props {
  order: SalesDoc;
  hook: any;
  stock: any;
  onBack: () => void;
}

export function SalesOrderDetailPage({ order, hook, stock, onBack }: Props) {
  const [lines, setLines] = useState<SalesDocLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [overrideDialog, setOverrideDialog] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [showAttach, setShowAttach] = useState(false);
  const { activeCompany } = useCompany();
  const { settings: companySettings } = useCompanySettings();
  const navigate = useNavigate();

  const deliveries = useDeliveries(order.id);

  const isEditable = order.status === "draft";
  const isLocked = ["invoiced", "cancelled"].includes(order.status);
  const canDeliver = ["confirmed", "partially_delivered"].includes(order.status);
  const canInvoice = ["delivered", "partially_delivered"].includes(order.status);

  useEffect(() => {
    hook.getLines(order.id).then((l: SalesDocLine[]) => {
      setLines(l);
      setLoading(false);
    });
  }, [order.id]);

  const { subtotal_ht, total_tva, total_ttc } = calcTotals(lines);

  const handleConfirm = async () => {
    await hook.confirm(order.id, stock.reserveStock);
  };

  const handleConfirmOverride = async () => {
    await hook.confirm(order.id, stock.reserveStock, true, overrideReason);
    setOverrideDialog(false);
  };

  const handleCreateDelivery = async () => {
    const del = await hook.createDeliveryDraft(order.id);
    if (del) {
      await deliveries.fetch();
      navigate("/ventes/livraisons");
    }
  };

  const handleCreateInvoice = async () => {
    await hook.createInvoiceFromOrder(order.id);
    navigate("/facturation/clients");
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) return;
    await hook.cancel(order.id, stock.releaseReservation, cancelReason);
    setCancelDialog(false);
    onBack();
  };

  const handlePrint = async () => {
    if (!companySettings) return;
    await generateDocumentPdf({
      type: "bon_commande",
      number: order.number,
      date: order.date,
      clientName: order.customer?.name || "—",
      lines: calcTotals(lines).lines.map(l => ({
        description: l.description, quantity: l.quantity, unit_price: l.unit_price,
        discount_percent: l.discount_percent, tva_rate: l.tva_rate,
        total_ht: l.total_ht, total_ttc: l.total_ttc,
      })),
      subtotalHt: subtotal_ht, totalTva: total_tva, totalTtc: total_ttc,
      notes: order.notes, paymentTerms: order.payment_terms,
    }, companySettings);
  };

  const statusCfg = {
    color: ORDER_STATUS_COLORS[order.status] || "bg-muted text-muted-foreground",
    label: ORDER_STATUS_LABELS[order.status] || order.status,
  };

  return (
    <AppLayout title={order.number} subtitle="Bon de commande client">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="h-8 px-2">
              <ArrowLeft className="h-4 w-4 mr-1" /> Retour
            </Button>
            <Badge className={`${statusCfg.color} border text-sm px-3 py-1`}>{statusCfg.label}</Badge>
            {order.quotation_id && (
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate("/ventes/devis")}>
                ← Voir le Devis
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="h-9" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" /> Imprimer
            </Button>
            <Button variant="outline" size="sm" className="h-9" onClick={() => setShowAttach(true)}>
              <Paperclip className="h-4 w-4 mr-1" /> Pièces jointes
            </Button>

            {/* Confirm BC */}
            {order.status === "draft" && (
              <Button size="sm" className="h-9" onClick={handleConfirm}>
                <Check className="h-4 w-4 mr-1" /> Confirmer BC
              </Button>
            )}

            {/* Stock override */}
            {order.status === "draft" && (
              <Button size="sm" variant="outline" className="h-9 border-warning/50 text-warning-foreground" onClick={() => setOverrideDialog(true)}>
                <AlertTriangle className="h-4 w-4 mr-1" /> Dérogation stock
              </Button>
            )}

            {/* Create delivery draft */}
            {canDeliver && (
              <Button size="sm" className="h-9" onClick={handleCreateDelivery}>
                <Truck className="h-4 w-4 mr-1" /> Créer Livraison (Brouillon)
              </Button>
            )}

            {/* Create invoice */}
            {canInvoice && (
              <Button size="sm" className="h-9 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleCreateInvoice}>
                <FileText className="h-4 w-4 mr-1" /> Créer Facture (Brouillon)
              </Button>
            )}

            {/* Cancel */}
            {!isLocked && (
              <Button size="sm" variant="destructive" className="h-9" onClick={() => setCancelDialog(true)}>
                <X className="h-4 w-4 mr-1" /> Annuler
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* Smart workflow breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-4 py-2 border">
          <span
            className="hover:text-primary cursor-pointer"
            onClick={() => navigate("/ventes/devis")}
          >
            Devis
          </span>
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium text-foreground">BC Client</span>
          <ChevronRight className="h-3 w-3" />
          <span
            className={`${deliveries.items.length > 0 ? "text-foreground cursor-pointer hover:text-primary font-medium" : "opacity-40"}`}
            onClick={() => deliveries.items.length > 0 && navigate("/ventes/livraisons")}
          >
            Bon de Livraison {deliveries.items.length > 0 && `(${deliveries.items.length})`}
          </span>
          <ChevronRight className="h-3 w-3" />
          <span className={order.status === "invoiced" ? "text-primary font-medium cursor-pointer hover:underline" : "opacity-40"}
            onClick={() => order.status === "invoiced" && navigate("/facturation/clients")}>
            Facture Client
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-5">
            {/* Customer info */}
            <div className="bg-card border rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" /> Informations
              </h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client</span>
                  <span className="font-medium">{order.customer?.name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dépôt</span>
                  <span className="font-medium">{order.warehouse?.name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Conditions paiement</span>
                  <span className="font-medium">{order.payment_terms || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{order.date}</span>
                </div>
              </div>
              {order.notes && (
                <div className="text-sm bg-muted/40 rounded-md p-3 text-muted-foreground">{order.notes}</div>
              )}
            </div>

            {/* Lines */}
            <div className="bg-card border rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Lignes de commande</h3>
              {loading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground border-b">
                        <th className="text-left pb-2">Description</th>
                        <th className="text-right pb-2">Qté cmd</th>
                        <th className="text-right pb-2">Qté livrée</th>
                        <th className="text-right pb-2">Prix HT</th>
                        <th className="text-right pb-2">TVA</th>
                        <th className="text-right pb-2">Total TTC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l, i) => {
                        const calc = calcLine(l);
                        const fullyDelivered = Number(l.delivered_qty || 0) >= Number(l.quantity);
                        return (
                          <tr key={l.id || i} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                            <td className="py-2 pr-3">{l.description || "—"}</td>
                            <td className="py-2 text-right">{l.quantity}</td>
                            <td className="py-2 text-right">
                              <span className={fullyDelivered ? "text-success font-medium" : "text-warning-foreground"}>
                                {l.delivered_qty || 0}
                              </span>
                            </td>
                            <td className="py-2 text-right">{calc.total_ht.toLocaleString("fr-MA")}</td>
                            <td className="py-2 text-right">{l.tva_rate}%</td>
                            <td className="py-2 text-right font-medium">{calc.total_ttc.toLocaleString("fr-MA")}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Deliveries mini list */}
            <DeliveryMiniList
              deliveries={deliveries}
              stock={stock}
              onNavigate={() => navigate("/ventes/livraisons")}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-card border rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Totaux</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Sous-total HT</span>
                  <span className="font-medium text-foreground">{Number(order.subtotal_ht).toLocaleString("fr-MA")} MAD</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>TVA</span>
                  <span className="font-medium text-foreground">{Number(order.total_tva).toLocaleString("fr-MA")} MAD</span>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>Total TTC</span>
                  <span className="text-primary">{Number(order.total_ttc).toLocaleString("fr-MA")} MAD</span>
                </div>
              </div>
            </div>

            <div className="bg-card border rounded-xl p-5 space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" /> Infos
              </h3>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Référence</span>
                  <span className="font-mono font-medium text-foreground">{order.number}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date</span>
                  <span className="text-foreground">{order.date}</span>
                </div>
                <div className="flex justify-between">
                  <span>Statut</span>
                  <Badge className={`${ORDER_STATUS_COLORS[order.status]} border text-xs`}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Livraisons</span>
                  <span className="font-medium text-foreground">{deliveries.items.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAttach && (
        <DocAttachmentsDialog
          open onClose={() => setShowAttach(false)}
          docType="sales_order" docId={order.id} docNumber={order.number}
          companyId={activeCompany?.id}
        />
      )}

      {/* Cancel dialog */}
      <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Annuler le bon de commande</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Motif d'annulation requis (libère le stock réservé) :</p>
          <Textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Motif..." rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(false)}>Retour</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={!cancelReason.trim()}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Override dialog */}
      <Dialog open={overrideDialog} onOpenChange={setOverrideDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Dérogation stock insuffisant</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Le stock disponible est insuffisant. En tant qu'administrateur, vous pouvez forcer la confirmation. Indiquez un motif :</p>
          <Textarea value={overrideReason} onChange={e => setOverrideReason(e.target.value)} placeholder="Motif de dérogation..." rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideDialog(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleConfirmOverride} disabled={!overrideReason.trim()}>
              <AlertTriangle className="h-4 w-4 mr-1" /> Forcer la confirmation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
