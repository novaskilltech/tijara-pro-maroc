import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStockEngine } from "@/hooks/useStockEngine";
import { useCashRegisters } from "@/hooks/useCashRegisters";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Package, Warehouse, Loader2, ArrowRightLeft, ClipboardCheck, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

const Stock = () => {
  const { stockLevels, movements, transfers, adjustments, loading, fetchAll, createTransfer, validateTransfer, createAdjustment, validateAdjustment } = useStockEngine();
  const [tab, setTab] = useState("levels");
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [filterWarehouse, setFilterWarehouse] = useState("all");

  // Transfer state
  const [tFromWh, setTFromWh] = useState("");
  const [tToWh, setTToWh] = useState("");
  const [tLines, setTLines] = useState<{ product_id: string; quantity: number }[]>([{ product_id: "", quantity: 0 }]);
  const [tNotes, setTNotes] = useState("");

  // Adjustment state
  const [aWh, setAWh] = useState("");
  const [aLines, setALines] = useState<{ product_id: string; system_qty: number; counted_qty: number }[]>([]);
  const [aNotes, setANotes] = useState("");

  useEffect(() => {
    (supabase as any).from("warehouses").select("id, name, code").eq("is_active", true).then(({ data }: any) => { setWarehouses(data || []); });
    (supabase as any).from("products").select("id, name, code").eq("is_active", true).order("name").then(({ data }: any) => setProducts(data || []));
  }, []);

  const filteredLevels = filterWarehouse === "all" ? stockLevels : stockLevels.filter(sl => sl.warehouse_id === filterWarehouse);

  const stockValue = filteredLevels.reduce((s, sl) => s + sl.stock_on_hand * sl.cmup, 0);

  const handleCreateTransfer = async () => {
    if (!tFromWh || !tToWh || tFromWh === tToWh) return;
    const validLines = tLines.filter(l => l.product_id && l.quantity > 0);
    if (validLines.length === 0) return;
    await createTransfer(tFromWh, tToWh, validLines, tNotes);
    setShowTransfer(false);
    setTLines([{ product_id: "", quantity: 0 }]);
  };

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
    <AppLayout title="Stock" subtitle="Gestion des stocks et inventaires">
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="levels">Niveaux de stock</TabsTrigger>
          <TabsTrigger value="movements">Mouvements</TabsTrigger>
          <TabsTrigger value="transfers">Transferts</TabsTrigger>
          <TabsTrigger value="inventory">Inventaires</TabsTrigger>
          <TabsTrigger value="master">Données maîtres</TabsTrigger>
        </TabsList>

        <TabsContent value="levels">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Select value={filterWarehouse} onValueChange={setFilterWarehouse}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Tous les dépôts" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les dépôts</SelectItem>
                    {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Card className="px-4 py-2">
                  <p className="text-xs text-muted-foreground">Valeur du stock</p>
                  <p className="text-lg font-bold text-primary">{stockValue.toLocaleString("fr-MA")} MAD</p>
                </Card>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : filteredLevels.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucun stock enregistré</p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead>Dépôt</TableHead>
                      <TableHead className="text-right">En main</TableHead>
                      <TableHead className="text-right">Réservé</TableHead>
                      <TableHead className="text-right">Disponible</TableHead>
                      <TableHead className="text-right">CMUP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLevels.map(sl => (
                      <TableRow key={sl.id}>
                        <TableCell>{sl.product?.code} — {sl.product?.name}</TableCell>
                        <TableCell>{sl.warehouse?.name}</TableCell>
                        <TableCell className="text-right">{sl.stock_on_hand}</TableCell>
                        <TableCell className="text-right">{sl.stock_reserved}</TableCell>
                        <TableCell className="text-right font-medium">
                          <span className={sl.stock_available <= 0 ? "text-destructive" : "text-green-600"}>{sl.stock_available}</span>
                        </TableCell>
                        <TableCell className="text-right">{Number(sl.cmup).toLocaleString("fr-MA")} MAD</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="movements">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Journal des mouvements</h2>
            {movements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucun mouvement</p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Produit</TableHead>
                      <TableHead>Dépôt</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Quantité</TableHead>
                      <TableHead className="text-right">Coût unitaire</TableHead>
                      <TableHead>Référence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm">{new Date(m.created_at).toLocaleDateString("fr-MA")}</TableCell>
                        <TableCell>{m.product?.code} — {m.product?.name}</TableCell>
                        <TableCell>{m.warehouse?.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={m.movement_type === "in" ? "text-green-600" : m.movement_type === "out" ? "text-destructive" : ""}>
                            {m.movement_type === "in" ? "Entrée" : m.movement_type === "out" ? "Sortie" : m.movement_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{m.quantity}</TableCell>
                        <TableCell className="text-right">{Number(m.unit_cost).toLocaleString("fr-MA")}</TableCell>
                        <TableCell className="text-xs">{m.reference_type || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="transfers">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Transferts inter-dépôts</h2>
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
                            <Button size="sm" variant="outline" onClick={() => validateTransfer(t.id)}>Valider</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="inventory">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Inventaires physiques</h2>
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
        </TabsContent>

        <TabsContent value="master">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link to="/stock/produits" className="bg-card rounded-lg border border-border shadow-card p-6 hover:border-primary/30 hover:bg-accent/30 transition-all group">
              <Package className="h-8 w-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-foreground">Produits & Articles</h3>
              <p className="text-sm text-muted-foreground mt-1">Gérez votre catalogue produits.</p>
            </Link>
            <Link to="/stock/depots" className="bg-card rounded-lg border border-border shadow-card p-6 hover:border-primary/30 hover:bg-accent/30 transition-all group">
              <Warehouse className="h-8 w-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-foreground">Dépôts & Entrepôts</h3>
              <p className="text-sm text-muted-foreground mt-1">Configurez vos emplacements.</p>
            </Link>
          </div>
        </TabsContent>
      </Tabs>

      {/* Transfer Dialog */}
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
                <Button variant="outline" onClick={() => setShowTransfer(false)}>Annuler</Button>
                <Button onClick={handleCreateTransfer}>Créer</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Adjustment Dialog */}
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

export default Stock;
