import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import {
  DELIVERY_STATUS_LABELS, DELIVERY_STATUS_COLORS,
} from "@/hooks/useSales";
import { DocAttachmentsDialog } from "@/components/DocAttachmentsDialog";
import { useCompany } from "@/hooks/useCompany";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { generateDocumentPdf } from "@/lib/pdf-generator";
import {
  ArrowLeft, Check, X, FileText, Printer, Paperclip,
  Loader2, ChevronRight, Calendar, Building2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { emailService } from "@/services/emailService";
import { fetchCompany, fetchDefaultBank } from "@/lib/pdf/index";
import { AuditLogViewer } from "@/components/system/AuditLogViewer";
import { Mail, Send, History } from "lucide-react";

interface Props {
  delivery: any;
  hook: any;
  stock: any;
  onBack: () => void;
}

export function DeliveryDetailPage({ delivery, hook, stock, onBack }: Props) {
  const [lines, setLines] = useState<any[]>([]);
  const [editableQtys, setEditableQtys] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showAttach, setShowAttach] = useState(false);
  const [validating, setValidating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const { activeCompany } = useCompany();
  const { settings: companySettings } = useCompanySettings();
  const navigate = useNavigate();

  const isLocked = ["validated", "cancelled"].includes(delivery.status);

  useEffect(() => {
    hook.getDeliveryLines(delivery.id).then((l: any[]) => {
      setLines(l);
      const qtys: Record<string, number> = {};
      l.forEach((line: any) => { qtys[line.id] = Number(line.quantity); });
      setEditableQtys(qtys);
      setLoading(false);
    });
  }, [delivery.id]);

  const handleValidate = async () => {
    setValidating(true);
    // Update each line qty first if changed
    for (const line of lines) {
      const newQty = editableQtys[line.id];
      if (newQty !== Number(line.quantity)) {
        await hook.updateDeliveryLine(line.id, newQty);
      }
    }
    await hook.validateDelivery(delivery.id, stock.deductStock, stock.releaseReservation);
    setValidating(false);
    onBack();
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) return;
    await hook.cancelDelivery(delivery.id, cancelReason);
    setCancelDialog(false);
    onBack();
  };

  const handlePrint = async () => {
    if (!companySettings) return;
    await generateDocumentPdf({
      type: "bon_livraison",
      number: delivery.delivery_number,
      date: delivery.delivery_date,
      clientName: delivery.customer?.name || "—",
      lines: lines.map((l: any) => ({
        description: l.description,
        quantity: Number(l.quantity),
        unit_price: Number(l.unit_price),
        discount_percent: Number(l.discount_percent || 0),
        tva_rate: Number(l.tva_rate),
        total_ht: Number(l.total_ht),
        total_ttc: Number(l.total_ttc),
      })),
      subtotalHt: lines.reduce((s, l) => s + Number(l.total_ht), 0),
      totalTva: lines.reduce((s, l) => s + Number(l.total_tva), 0),
      totalTtc: lines.reduce((s, l) => s + Number(l.total_ttc), 0),
    }, companySettings);
  };

  const handleSendEmail = async () => {
    if (!delivery.customer?.email) {
      toast({
        title: "Email manquant",
        description: "Le client n'a pas d'adresse email configurée.",
        variant: "destructive",
      });
      return;
    }

    setSendingEmail(true);
    try {
      const [company, bank] = await Promise.all([
        fetchCompany(activeCompany?.id),
        fetchDefaultBank(activeCompany?.id),
      ]);

      if (!company) throw new Error("Company data not found");

      const data = {
        type: "bon_livraison" as any,
        number: delivery.delivery_number,
        date: delivery.delivery_date,
        party: {
          name: delivery.customer.name,
          email: delivery.customer.email,
          phone: delivery.customer.phone,
          address: delivery.customer.address,
        },
        lines: lines.map(l => ({
          description: l.description,
          quantity: Number(l.quantity),
          unit_price: Number(l.unit_price),
          discount_percent: Number(l.discount_percent || 0),
          tva_rate: Number(l.tva_rate),
          total_ht: Number(l.total_ht),
          total_ttc: Number(l.total_ttc),
        })),
        subtotalHt: lines.reduce((s, l) => s + Number(l.total_ht), 0),
        totalTva: lines.reduce((s, l) => s + Number(l.total_tva), 0),
        totalTtc: lines.reduce((s, l) => s + Number(l.total_ttc), 0),
        notes: delivery.notes,
        company,
        bankAccount: bank,
      };

      await emailService.sendDocument(data, delivery.customer.email);
    } catch (err) {
      console.error("Email send error:", err);
    } finally {
      setSendingEmail(false);
    }
  };

  const statusCfg = {
    color: DELIVERY_STATUS_COLORS[delivery.status] || "bg-muted text-muted-foreground",
    label: DELIVERY_STATUS_LABELS[delivery.status] || delivery.status,
  };

  return (
    <AppLayout title={delivery.delivery_number} subtitle="Bon de livraison">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="h-8 px-2">
              <ArrowLeft className="h-4 w-4 mr-1" /> Retour
            </Button>
            <Badge className={`${statusCfg.color} border text-sm px-3 py-1`}>{statusCfg.label}</Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="h-9" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" /> Imprimer
            </Button>
            <Button variant="outline" size="sm" className="h-9" onClick={handleSendEmail} disabled={sendingEmail}>
              {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Mail className="h-4 w-4 mr-1" />}
              Email
            </Button>
            <Button variant="outline" size="sm" className="h-9" onClick={() => setShowAttach(true)}>
              <Paperclip className="h-4 w-4 mr-1" /> Pièces jointes
            </Button>

            {delivery.status === "draft" && (
              <>
                <Button
                  size="sm" className="h-9"
                  onClick={handleValidate} disabled={validating}
                >
                  {validating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                  Valider Livraison
                </Button>
                <Button size="sm" variant="destructive" className="h-9" onClick={() => setCancelDialog(true)}>
                  <X className="h-4 w-4 mr-1" /> Annuler
                </Button>
              </>
            )}

            {delivery.status === "validated" && !delivery.invoice_id && (
              <Button size="sm" className="h-9" onClick={() => navigate("/facturation/clients")}>
                <FileText className="h-4 w-4 mr-1" /> Voir les Factures
              </Button>
            )}
            {delivery.invoice_id && (
              <Badge variant="outline" className="text-xs">Facturé</Badge>
            )}
          </div>
        </div>

        <Separator />

        {/* Smart workflow breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-4 py-2 border">
          <span className="cursor-pointer hover:text-primary" onClick={() => navigate("/ventes/devis")}>Devis</span>
          <ChevronRight className="h-3 w-3" />
          <span className="cursor-pointer hover:text-primary" onClick={() => navigate("/ventes/commandes")}>BC Client</span>
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium text-foreground">Bon de Livraison</span>
          <ChevronRight className="h-3 w-3" />
          <span
            className={`${delivery.invoice_id ? "text-primary font-medium cursor-pointer hover:underline" : "opacity-40"}`}
            onClick={() => delivery.invoice_id && navigate("/facturation/clients")}
          >
            Facture Client
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-5">
            {/* Info */}
            <div className="bg-card border rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" /> Informations
              </h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client</span>
                  <span className="font-medium">{delivery.customer?.name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dépôt</span>
                  <span className="font-medium">{delivery.warehouse?.name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date livraison</span>
                  <span className="font-medium">{delivery.delivery_date}</span>
                </div>
                {delivery.sales_order_id && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">BC source</span>
                    <Button variant="link" className="h-auto p-0 text-sm" onClick={() => navigate("/ventes/commandes")}>
                      Voir le BC
                    </Button>
                  </div>
                )}
              </div>
              {delivery.notes && (
                <div className="text-sm bg-muted/40 rounded-md p-3 text-muted-foreground">{delivery.notes}</div>
              )}
            </div>

            {/* Lines */}
            <div className="bg-card border rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                Lignes de livraison
                {delivery.status === "draft" && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">(modifiez les quantités avant validation)</span>
                )}
              </h3>
              {loading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-muted-foreground border-b">
                        <th className="text-left pb-2">Description</th>
                        <th className="text-right pb-2">Qté à livrer</th>
                        <th className="text-right pb-2">Prix HT</th>
                        <th className="text-right pb-2">TVA%</th>
                        <th className="text-right pb-2">Total TTC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l, i) => (
                        <tr key={l.id} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                          <td className="py-2 pr-3">{l.description}</td>
                          <td className="py-2 text-right">
                            {delivery.status === "draft" ? (
                              <Input
                                type="number"
                                className="w-20 h-7 text-xs text-right ml-auto"
                                min={0}
                                value={editableQtys[l.id] ?? Number(l.quantity)}
                                onChange={e => setEditableQtys({
                                  ...editableQtys,
                                  [l.id]: Math.max(0, Number(e.target.value)),
                                })}
                              />
                            ) : (
                              <span className="font-medium">{l.quantity}</span>
                            )}
                          </td>
                          <td className="py-2 text-right">{Number(l.unit_price).toLocaleString("fr-MA")}</td>
                          <td className="py-2 text-right">{l.tva_rate}%</td>
                          <td className="py-2 text-right font-medium">{Number(l.total_ttc).toLocaleString("fr-MA")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-card border rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Totaux</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Sous-total HT</span>
                  <span className="font-medium text-foreground">
                    {lines.reduce((s, l) => s + Number(l.total_ht), 0).toLocaleString("fr-MA")} MAD
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>TVA</span>
                  <span className="font-medium text-foreground">
                    {lines.reduce((s, l) => s + Number(l.total_tva), 0).toLocaleString("fr-MA")} MAD
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>Total TTC</span>
                  <span className="text-primary">
                    {lines.reduce((s, l) => s + Number(l.total_ttc), 0).toLocaleString("fr-MA")} MAD
                  </span>
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
                  <span className="font-mono font-medium text-foreground">{delivery.delivery_number}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date</span>
                  <span className="text-foreground">{delivery.delivery_date}</span>
                </div>
                <div className="flex justify-between">
                  <span>Statut</span>
                  <Badge className={`${DELIVERY_STATUS_COLORS[delivery.status] || ""} border text-xs`}>
                    {DELIVERY_STATUS_LABELS[delivery.status]}
                  </Badge>
                </div>
                {delivery.invoice_id && (
                  <div className="flex justify-between">
                    <span>Facture</span>
                    <Badge variant="outline" className="text-xs">Facturé</Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Audit Logs */}
            <div className="bg-card border rounded-xl overflow-hidden h-[400px]">
              <div className="p-4 border-b bg-muted/30">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" /> Historique
                </h3>
              </div>
              <AuditLogViewer 
                tableName="deliveries" 
                recordId={delivery.id} 
                companyId={activeCompany?.id} 
              />
            </div>
          </div>
        </div>
      </div>

      {showAttach && (
        <DocAttachmentsDialog
          open onClose={() => setShowAttach(false)}
          docType="delivery" docId={delivery.id} docNumber={delivery.delivery_number}
          companyId={activeCompany?.id}
        />
      )}

      <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Annuler le bon de livraison</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Motif d'annulation requis :</p>
          <Textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} placeholder="Motif..." rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(false)}>Retour</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={!cancelReason.trim()}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
