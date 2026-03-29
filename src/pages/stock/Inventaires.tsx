import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useStockEngine } from "@/hooks/useStockEngine";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClipboardCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Inventaires = () => {
  const { adjustments, createAdjustment, validateAdjustment } = useStockEngine();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [aWh, setAWh] = useState("");
  const [aLines, setALines] = useState<{ product_id: string; system_qty: number; counted_qty: number }[]>([]);
  const [aNotes, setANotes] = useState("");

  useEffect(() => {
    (supabase as any).from("warehouses").select("id, name, code").eq("is_active", true).then(({ data }: any) => setWarehouses(data || []));
    (supabase as any).from("products").select("id, name, code").eq("is_active", true).order("name").then(({ data }: any) => setProducts(data || []));
  }, []);

  const loadAdjustmentStock = async (whId: string) => {
    setAWh(whId);
    const { data } = await (supabase as any).from("stock_levels").select("product_id, stock_on_hand, product:products(name, code)").eq("warehouse_id", whId);
    setALines((data || []).map((d: any) => ({ product_id: d.product_id, system_qty: Number(d.stock_on_hand), counted_qty: Number(d.stock_on_hand) })));
  };

  const handleCreateAdjustment = async () => {
    if (!aWh) return;
    const changed = aLines.filter(l => l.counted_qty !== l.system_qty);
    if (changed.length === 0) return;
    await createAdjustment(aWh, changed, aNotes);
    setShowAdjustment(false);
  };

  return (
    <AppLayout title="Inventaires physiques" subtitle="Comptage et ajustement des stocks">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Inventaires</h2>
          <Button size="sm" onClick={() => setShowAdjustment(true)}><ClipboardCheck className="h-4 w-4 mr-1" /> Nouvel inventaire</Button>
        </div>
        {adjustments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Aucun inventaire</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Dépôt</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-sm">{a.adjustment_number}</TableCell>
                    <TableCell>{a.warehouse?.name}</TableCell>
                    <TableCell>
                      <Badge className={a.status === "validated" ? "bg-success/15 text-success border-0" : "bg-muted text-muted-foreground border-0"}>
                        {a.status === "draft" ? "Brouillon" : "Validé"}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(a.created_at).toLocaleDateString("fr-MA")}</TableCell>
                    <TableCell className="text-right">
                      {a.status === "draft" && (
                        <Button size="sm" variant="outline" onClick={() => validateAdjustment(a.id)}>Valider</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {showAdjustment && (
        <Dialog open onOpenChange={() => setShowAdjustment(false)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nouvel inventaire physique</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Dépôt</Label>
                <Select value={aWh} onValueChange={loadAdjustmentStock}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner le dépôt" /></SelectTrigger>
                  <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {aLines.length > 0 && (
                <div className="space-y-2">
                  {aLines.map((line, idx) => {
                    const p = products.find(p => p.id === line.product_id);
                    const diff = line.counted_qty - line.system_qty;
                    return (
                      <div key={idx} className="flex items-center gap-3">
                        <span className="text-sm flex-1">{p?.code} — {p?.name}</span>
                        <span className="text-xs text-muted-foreground">Système: {line.system_qty}</span>
                        <Input type="number" className="w-24 h-8" value={line.counted_qty} onChange={(e) => { const u = [...aLines]; u[idx].counted_qty = Number(e.target.value); setALines(u); }} />
                        {diff !== 0 && <Badge className={diff > 0 ? "bg-success/15 text-success border-0" : "bg-destructive/10 text-destructive border-0"}>{diff > 0 ? `+${diff}` : diff}</Badge>}
                      </div>
                    );
                  })}
                </div>
              )}
              <div><Label>Notes</Label><Textarea value={aNotes} onChange={(e) => setANotes(e.target.value)} rows={2} /></div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAdjustment(false)}>Annuler</Button>
                <Button onClick={handleCreateAdjustment}>Créer & valider</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
};

export default Inventaires;
