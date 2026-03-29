import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Package, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useCompany } from "@/hooks/useCompany";

interface Props {
  orders: any;
  stock: any;
}

export function ReceptionPanel({ orders, stock }: Props) {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? null;
  const [receptions, setReceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [receptionDialog, setReceptionDialog] = useState<string | null>(null);
  const [orderLines, setOrderLines] = useState<any[]>([]);
  const [receptionQtys, setReceptionQtys] = useState<Record<string, number>>({});

  const fetchReceptions = useCallback(async () => {
    if (!companyId) { setReceptions([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("receptions")
      .select("*, supplier:suppliers(name)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    setReceptions(data || []);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetchReceptions(); }, [fetchReceptions]);

  const openReceptionDialog = async (orderId: string) => {
    const lines = await orders.getLines(orderId);
    setOrderLines(lines);
    const qtys: Record<string, number> = {};
    lines.forEach((l: any) => {
      const remaining = Number(l.quantity) - Number(l.received_qty || 0);
      qtys[l.id] = Math.max(0, remaining);
    });
    setReceptionQtys(qtys);
    setReceptionDialog(orderId);
  };

  const handleCreateReception = async () => {
    if (!receptionDialog) return;
    const linesToReceive = orderLines
      .filter((l: any) => (receptionQtys[l.id] || 0) > 0)
      .map((l: any) => ({
        purchase_order_line_id: l.id,
        product_id: l.product_id,
        description: l.description,
        quantity: receptionQtys[l.id],
        unit_price: Number(l.unit_price),
        discount_percent: Number(l.discount_percent || 0),
        tva_rate: Number(l.tva_rate),
      }));

    if (linesToReceive.length === 0) {
      toast({ title: "Aucune quantité à réceptionner", variant: "destructive" });
      return;
    }

    await orders.createReception(receptionDialog, linesToReceive, stock.addStock);
    setReceptionDialog(null);
    await fetchReceptions();
    await stock.fetchAll();
  };

  const handleCreateInvoice = async (receptionId: string) => {
    await orders.createInvoiceFromReception(receptionId);
    await fetchReceptions();
  };

  const eligibleOrders = orders.items.filter((o: any) => o.status === "validated" || o.status === "received");

  return (
    <div className="space-y-4">
      {eligibleOrders.length > 0 && (
        <div className="space-y-2 mb-4">
          <p className="text-sm text-muted-foreground">BC éligibles à la réception :</p>
          {eligibleOrders.map((o: any) => (
            <div key={o.id} className="flex items-center justify-between bg-muted/30 rounded-md p-2">
              <span className="text-sm font-mono">{o.number} — {o.supplier?.name}</span>
              <Button size="sm" variant="outline" onClick={() => openReceptionDialog(o.id)}>
                <Package className="h-3 w-3 mr-1" /> Réceptionner
              </Button>
            </div>
          ))}
        </div>
      )}

      <h3 className="text-md font-semibold text-foreground">Réceptions</h3>

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : receptions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">Aucune réception</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N°</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receptions.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{r.reception_number}</TableCell>
                  <TableCell>{r.supplier?.name}</TableCell>
                  <TableCell>{r.reception_date}</TableCell>
                  <TableCell>
                    <Badge className={r.status === "validated" ? "bg-success/15 text-success border-0" : "bg-muted text-muted-foreground border-0"}>
                      {r.status === "validated" ? "Validé" : r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === "validated" && !r.invoice_id && (
                      <Button size="sm" variant="outline" onClick={() => handleCreateInvoice(r.id)}>
                        <FileText className="h-3 w-3 mr-1" /> Facturer
                      </Button>
                    )}
                    {r.invoice_id && <Badge variant="outline">Facturé</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {receptionDialog && (
        <Dialog open onOpenChange={() => setReceptionDialog(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Créer une réception</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Spécifiez les quantités reçues :</p>
              {orderLines.map((l: any) => {
                const remaining = Number(l.quantity) - Number(l.received_qty || 0);
                return (
                  <div key={l.id} className="flex items-center gap-3">
                    <span className="text-sm flex-1">{l.product?.code || "—"} — {l.description}</span>
                    <span className="text-xs text-muted-foreground">Commandé: {l.quantity} | Reçu: {l.received_qty || 0}</span>
                    <Input
                      type="number"
                      className="w-20 h-8 text-sm"
                      min={0}
                      max={remaining}
                      value={receptionQtys[l.id] || 0}
                      onChange={(e) => setReceptionQtys({ ...receptionQtys, [l.id]: Math.min(Number(e.target.value), remaining) })}
                    />
                  </div>
                );
              })}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setReceptionDialog(null)}>Annuler</Button>
                <Button onClick={handleCreateReception}>Valider la réception</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
