import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useCashRegisters, CashRegister } from "@/hooks/useCashRegisters";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ViewToggle } from "@/components/ViewToggle";
import { Plus, Loader2, ArrowDownCircle, ArrowUpCircle, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type StatusFilter = "all" | "active" | "inactive";

export default function CashRegistersPage() {
  const { registers, movements, loading, create, update, remove, addMovement, fetchMovements } = useCashRegisters();
  const [view, setView] = useState<"list" | "kanban">("kanban");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingRegister, setEditingRegister] = useState<CashRegister | null>(null);
  const [showMovement, setShowMovement] = useState<string | null>(null);
  const [selectedRegister, setSelectedRegister] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CashRegister | null>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [openingBalance, setOpeningBalance] = useState(0);
  const [isActive, setIsActive] = useState(true);

  // Movement form
  const [mvtType, setMvtType] = useState<"in" | "out">("in");
  const [mvtAmount, setMvtAmount] = useState(0);
  const [mvtRef, setMvtRef] = useState("");
  const [mvtNotes, setMvtNotes] = useState("");

  useEffect(() => {
    (supabase as any).from("warehouses").select("id, name").eq("is_active", true).then(({ data }: any) => setWarehouses(data || []));
  }, []);

  const filtered = registers.filter(r => {
    if (statusFilter === "active") return r.is_active;
    if (statusFilter === "inactive") return !r.is_active;
    return true;
  });

  const openCreate = () => {
    setEditingRegister(null);
    setName(""); setCode(""); setWarehouseId(""); setOpeningBalance(0); setIsActive(true);
    setShowForm(true);
  };

  const openEdit = (r: CashRegister) => {
    setEditingRegister(r);
    setName(r.name); setCode(r.code); setWarehouseId(r.warehouse_id || ""); setIsActive(r.is_active);
    setOpeningBalance(r.opening_balance);
    setShowForm(true);
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedCode = code.trim();
    const others = registers.filter(r => r.id !== editingRegister?.id);

    if (others.some(r => r.code.toLowerCase() === trimmedCode.toLowerCase())) {
      toast({ title: "Erreur", description: "Code déjà utilisé.", variant: "destructive" });
      return;
    }
    if (others.some(r => r.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast({ title: "Erreur", description: "Nom déjà utilisé.", variant: "destructive" });
      return;
    }

    setSaving(true);
    let ok: boolean;
    if (editingRegister) {
      ok = await update(editingRegister.id, { name: trimmedName, code: trimmedCode, warehouse_id: warehouseId || null, is_active: isActive });
    } else {
      ok = await create({ name: trimmedName, code: trimmedCode, warehouse_id: warehouseId || null, opening_balance: openingBalance, is_active: isActive } as any);
    }
    setSaving(false);
    if (ok) {
      setShowForm(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await remove(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleAddMovement = async () => {
    if (!showMovement || mvtAmount <= 0) return;
    await addMovement(showMovement, mvtType, mvtAmount, mvtRef, mvtNotes);
    setShowMovement(null);
    setMvtAmount(0); setMvtRef(""); setMvtNotes("");
  };

  const viewMovements = async (registerId: string) => {
    setSelectedRegister(registerId);
    await fetchMovements(registerId);
  };

  const statusBadge = (active: boolean) => (
    <Badge variant={active ? "default" : "secondary"}>
      {active ? "Active" : "Inactive"}
    </Badge>
  );

  return (
    <AppLayout title="Caisses enregistreuses" subtitle="Gestion des caisses et mouvements d'espèces">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <ViewToggle view={view} onChange={setView} />
            <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 gap-0.5">
              {([["all", "Toutes"], ["active", "Actives"], ["inactive", "Inactives"]] as [StatusFilter, string][]).map(([val, label]) => (
                <Button
                  key={val}
                  variant="ghost"
                  size="sm"
                  className={`h-8 rounded-md px-3 text-xs transition-all duration-200 ${statusFilter === val ? "bg-primary/15 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setStatusFilter(val)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Nouvelle caisse</Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Aucune caisse trouvée</p>
        ) : view === "kanban" ? (
          /* ===== KANBAN VIEW ===== */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(r => (
              <Card key={r.id} className={`relative cursor-pointer hover:border-primary/30 transition-colors ${!r.is_active ? "opacity-60" : ""}`} onClick={() => viewMovements(r.id)}>
                <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={e => { e.stopPropagation(); openEdit(r); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <CardHeader className="pb-2 pr-10">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm">{r.name}</CardTitle>
                    {statusBadge(r.is_active)}
                  </div>
                  <p className="text-xs text-muted-foreground">{r.code} {r.warehouse?.name ? `— ${r.warehouse.name}` : ""}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-primary">{Number(r.current_balance).toLocaleString("fr-MA")} MAD</p>
                  <p className="text-xs text-muted-foreground mt-1">Solde d'ouverture: {Number(r.opening_balance).toLocaleString("fr-MA")} MAD</p>
                  <Button size="sm" variant="outline" className="mt-3" onClick={e => { e.stopPropagation(); setShowMovement(r.id); }} disabled={!r.is_active}>
                    Mouvement
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* ===== LIST VIEW ===== */
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Dépôt</TableHead>
                  <TableHead>Solde</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date création</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id} className={`cursor-pointer ${!r.is_active ? "opacity-60" : ""}`} onClick={() => viewMovements(r.id)}>
                    <TableCell className="font-mono text-sm">{r.code}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.warehouse?.name || "—"}</TableCell>
                    <TableCell className="font-medium text-primary">{Number(r.current_balance).toLocaleString("fr-MA")} MAD</TableCell>
                    <TableCell>{statusBadge(r.is_active)}</TableCell>
                    <TableCell className="text-sm">{new Date(r.created_at).toLocaleDateString("fr-MA")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); openEdit(r); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); setDeleteTarget(r); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Movements list */}
        {selectedRegister && movements.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-md font-semibold">Mouvements récents</h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Référence</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm">{new Date(m.created_at).toLocaleDateString("fr-MA")}</TableCell>
                      <TableCell>
                        {m.movement_type === "in" ? <ArrowDownCircle className="h-4 w-4 text-green-600 inline mr-1" /> : <ArrowUpCircle className="h-4 w-4 text-destructive inline mr-1" />}
                        {m.movement_type === "in" ? "Entrée" : m.movement_type === "out" ? "Sortie" : m.movement_type}
                      </TableCell>
                      <TableCell className="text-right font-medium">{Number(m.amount).toLocaleString("fr-MA")} MAD</TableCell>
                      <TableCell className="text-sm">{m.reference || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.notes || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={() => setShowForm(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingRegister ? "Modifier la caisse" : "Nouvelle caisse"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nom *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Caisse principale" /></div>
            <div><Label>Code *</Label><Input value={code} onChange={e => setCode(e.target.value)} placeholder="CAISSE-01" /></div>
            <div>
              <Label>Dépôt (optionnel)</Label>
              <Select value={warehouseId} onValueChange={setWarehouseId}>
                <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                <SelectContent>{warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {!editingRegister && (
              <div><Label>Solde d'ouverture</Label><Input type="number" value={openingBalance} onChange={e => setOpeningBalance(Number(e.target.value))} /></div>
            )}
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
              <Button onClick={handleSave} disabled={!name.trim() || !code.trim() || saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingRegister ? "Enregistrer" : "Créer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la caisse ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la caisse "{deleteTarget?.name}" ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Movement Dialog */}
      <Dialog open={!!showMovement} onOpenChange={() => setShowMovement(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau mouvement</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select value={mvtType} onValueChange={v => setMvtType(v as "in" | "out")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Entrée</SelectItem>
                  <SelectItem value="out">Sortie</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Montant</Label><Input type="number" value={mvtAmount} onChange={e => setMvtAmount(Number(e.target.value))} /></div>
            <div><Label>Référence</Label><Input value={mvtRef} onChange={e => setMvtRef(e.target.value)} placeholder="REF-001" /></div>
            <div><Label>Notes</Label><Input value={mvtNotes} onChange={e => setMvtNotes(e.target.value)} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowMovement(null)}>Annuler</Button>
              <Button onClick={handleAddMovement} disabled={mvtAmount <= 0}>Enregistrer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
