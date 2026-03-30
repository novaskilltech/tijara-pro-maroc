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
import { ArrowRightLeft, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Transferts = () => {
  const { transfers, createTransfer, validateTransfer } = useStockEngine();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showTransfer, setShowTransfer] = useState(false);
  const [tFromWh, setTFromWh] = useState("");
  const [tToWh, setTToWh] = useState("");
  const [tLines, setTLines] = useState<{ product_id: string; quantity: number }[]>([{ product_id: "" , quantity: 0 }]);
  const [tNotes, setTNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    (supabase as any).from("warehouses").select("id, name, code").eq("is_active", true).then(({ data }: any) => setWarehouses(data || []));
    (supabase as any).from("products").select("id, name, code").eq("is_active", true).order("name").then(({ data }: any) => setProducts(data || []));
  }, []);

  const handleCreateTransfer = async () => {
    if (!tFromWh || !tToWh || tFromWh === tToWh) return;
    const validLines = tLines.filter(l => l.product_id && l.quantity > 0);
    if (validLines.length === 0) return;
    
    setIsSubmitting(true);
    try {
      await createTransfer(tFromWh, tToWh, validLines, tNotes);
      setShowTransfer(false);
      setTLines([{ product_id: "", quantity: 0 }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleValidateTransfer = async (id: string) => {
    setIsSubmitting(true);
    try {
      await validateTransfer(id);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout title="Transferts inter-dépôts" subtitle="Gestion des transferts de stock entre dépôts">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Transferts</h2>
          <Button size="sm" onClick={() => setShowTransfer(true)}><ArrowRightLeft className="h-4 w-4 mr-1" /> Nouveau transfert</Button>
        </div>
        {transfers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Aucun transfert</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>De</TableHead>
                  <TableHead>Vers</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-sm">{t.transfer_number}</TableCell>
                    <TableCell>{t.from_warehouse?.name}</TableCell>
                    <TableCell>{t.to_warehouse?.name}</TableCell>
                    <TableCell>
                      <Badge className={t.status === "validated" ? "bg-success/15 text-success border-0" : "bg-muted text-muted-foreground border-0"}>
                        {t.status === "draft" ? "Brouillon" : t.status === "validated" ? "Validé" : t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {t.status === "draft" && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleValidateTransfer(t.id)}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Valider"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {showTransfer && (
        <Dialog open onOpenChange={() => setShowTransfer(false)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Nouveau transfert</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Dépôt source</Label>
                  <Select value={tFromWh} onValueChange={setTFromWh}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Dépôt destination</Label>
                  <Select value={tToWh} onValueChange={setTToWh}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Produits</Label>
                {tLines.map((line, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Select value={line.product_id} onValueChange={(v) => { const u = [...tLines]; u[idx].product_id = v; setTLines(u); }}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Produit" /></SelectTrigger>
                      <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="number" className="w-24" placeholder="Qté" value={line.quantity} onChange={(e) => { const u = [...tLines]; u[idx].quantity = Number(e.target.value); setTLines(u); }} />
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => setTLines([...tLines, { product_id: "", quantity: 0 }])}><Plus className="h-3 w-3 mr-1" /> Ligne</Button>
              </div>
              <div><Label>Notes</Label><Textarea value={tNotes} onChange={(e) => setTNotes(e.target.value)} rows={2} /></div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowTransfer(false)} disabled={isSubmitting}>Annuler</Button>
                <Button onClick={handleCreateTransfer} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Créer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
};

export default Transferts;
