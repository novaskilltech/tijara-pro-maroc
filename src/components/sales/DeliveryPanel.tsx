import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Truck, FileText, Paperclip, Eye, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { DocAttachmentsDialog } from "@/components/DocAttachmentsDialog";
import { generateDocumentPdf } from "@/lib/pdf-generator";

interface Props {
  salesOrders: any;
  stock: any;
  showAll?: boolean;
}

export function DeliveryPanel({ salesOrders, stock, showAll }: Props) {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deliveryDialog, setDeliveryDialog] = useState<string | null>(null);
  const [orderLines, setOrderLines] = useState<any[]>([]);
  const [deliveryQtys, setDeliveryQtys] = useState<Record<string, number>>({});
  const [attachDialog, setAttachDialog] = useState<{ id: string; number: string } | null>(null);
  const { activeCompany } = useCompany();
  const { settings: companySettings } = useCompanySettings();
  const companyId = activeCompany?.id ?? null;

  const fetchDeliveries = useCallback(async () => {
    setLoading(true);
    let query = (supabase as any)
      .from("deliveries")
      .select("*, customer:customers(name), delivery_lines:delivery_lines(quantity)")
      .order("created_at", { ascending: false });
    if (companyId) query = query.eq("company_id", companyId);
    const { data } = await query;
    setDeliveries(data || []);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetchDeliveries(); }, [fetchDeliveries]);

  const openDeliveryDialog = async (orderId: string) => {
    const lines = await salesOrders.getLines(orderId);
    setOrderLines(lines);
    const qtys: Record<string, number> = {};
    lines.forEach((l: any) => {
      const remaining = Number(l.quantity) - Number(l.delivered_qty || 0);
      qtys[l.id] = Math.max(0, remaining);
    });
    setDeliveryQtys(qtys);
    setDeliveryDialog(orderId);
  };

  const handleCreateDelivery = async () => {
    if (!deliveryDialog) return;
    const linesToDeliver = orderLines
      .filter((l: any) => (deliveryQtys[l.id] || 0) > 0)
      .map((l: any) => ({
        sales_order_line_id: l.id,
        product_id: l.product_id,
        description: l.description,
        quantity: deliveryQtys[l.id],
        unit_price: Number(l.unit_price),
        discount_percent: Number(l.discount_percent),
        tva_rate: Number(l.tva_rate),
      }));

    if (linesToDeliver.length === 0) {
      toast({ title: "Aucune quantité à livrer", variant: "destructive" });
      return;
    }

    await salesOrders.createDelivery(deliveryDialog, linesToDeliver, stock.deductStock, stock.releaseReservation);
    setDeliveryDialog(null);
    await fetchDeliveries();
    await stock.fetchAll();
  };

  const handleCreateInvoice = async (deliveryId: string) => {
    await salesOrders.createInvoiceFromDelivery(deliveryId);
    await fetchDeliveries();
  };

  const handlePrint = async (d: any) => {
    if (!companySettings) return;
    const { data: lines } = await (supabase as any)
      .from("delivery_lines")
      .select("*")
      .eq("delivery_id", d.id)
      .order("sort_order");
    await generateDocumentPdf({
      type: "bon_livraison",
      number: d.delivery_number,
      date: d.delivery_date,
      clientName: d.customer?.name || "—",
      lines: (lines || []).map((l: any) => ({
        description: l.description,
        quantity: Number(l.quantity),
        unit_price: Number(l.unit_price),
        discount_percent: Number(l.discount_percent || 0),
        tva_rate: Number(l.tva_rate),
        total_ht: Number(l.total_ht),
        total_ttc: Number(l.total_ttc),
      })),
      subtotalHt: 0,
      totalTva: 0,
      totalTtc: 0,
    }, companySettings);
  };

  // Show eligible orders for delivery or all deliveries
  const eligibleOrders = salesOrders.items.filter((o: any) => o.status === "validated" || o.status === "delivered");

  return (
    <div className="space-y-4 mt-6">
      <h3 className="text-md font-semibold text-foreground">
        {showAll ? "Tous les bons de livraison" : "Livraisons"}
      </h3>

      {!showAll && eligibleOrders.length > 0 && (
        <div className="space-y-2 mb-4">
          <p className="text-sm text-muted-foreground">BC éligibles à la livraison :</p>
          {eligibleOrders.map((o: any) => (
            <div key={o.id} className="flex items-center justify-between bg-muted/30 rounded-md p-2">
              <span className="text-sm font-mono">{o.number} — {o.customer?.name}</span>
              <Button size="sm" variant="outline" onClick={() => openDeliveryDialog(o.id)}>
                <Truck className="h-3 w-3 mr-1" /> Livrer
              </Button>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : deliveries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Aucun bon de livraison</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N°</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-sm">{d.delivery_number}</TableCell>
                  <TableCell>{d.customer?.name}</TableCell>
                  <TableCell>{d.delivery_date}</TableCell>
                  <TableCell>
                    <Badge className={d.status === "validated" ? "bg-success/15 text-success border-0" : "bg-muted text-muted-foreground border-0"}>
                      {d.status === "validated" ? "Validé" : d.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Voir">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Imprimer" onClick={() => handlePrint(d)}>
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Pièces jointes"
                        onClick={() => setAttachDialog({ id: d.id, number: d.delivery_number })}>
                        <Paperclip className="h-3.5 w-3.5" />
                      </Button>
                      {d.status === "validated" && !d.invoice_id && (
                        <Button size="sm" variant="outline" onClick={() => handleCreateInvoice(d.id)}>
                          <FileText className="h-3 w-3 mr-1" /> Facturer
                        </Button>
                      )}
                      {d.invoice_id && <Badge variant="outline">Facturé</Badge>}
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
          docType="delivery"
          docId={attachDialog.id}
          docNumber={attachDialog.number}
          companyId={companyId}
        />
      )}

      {deliveryDialog && (
        <Dialog open onOpenChange={() => setDeliveryDialog(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Créer un bon de livraison</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Spécifiez les quantités à livrer :</p>
              {orderLines.map((l: any) => {
                const remaining = Number(l.quantity) - Number(l.delivered_qty || 0);
                return (
                  <div key={l.id} className="flex items-center gap-3">
                    <span className="text-sm flex-1">{l.product?.code || "—"} — {l.description}</span>
                    <span className="text-xs text-muted-foreground">Commandé: {l.quantity} | Livré: {l.delivered_qty || 0}</span>
                    <Input
                      type="number"
                      className="w-20 h-8 text-sm"
                      min={0}
                      max={remaining}
                      value={deliveryQtys[l.id] || 0}
                      onChange={(e) => setDeliveryQtys({ ...deliveryQtys, [l.id]: Math.min(Number(e.target.value), remaining) })}
                    />
                  </div>
                );
              })}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDeliveryDialog(null)}>Annuler</Button>
                <Button onClick={handleCreateDelivery}>Valider la livraison</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
