import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/EmptyState";
import { Plus, Edit, Trash2, Loader2, Percent } from "lucide-react";

interface TvaRate {
  id: string;
  name: string;
  rate: number;
  tva_type: string;
  is_active: boolean;
  sort_order: number;
}

const TYPE_LABELS: Record<string, string> = { sale: "Vente", purchase: "Achat", both: "Les deux" };

export default function TvaRatesPage() {
  const [items, setItems] = useState<TvaRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TvaRate | null>(null);
  const [form, setForm] = useState({ name: "", rate: 20, tva_type: "both", is_active: true, sort_order: 0 });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).from("tva_rates").select("*").order("sort_order").order("rate");
    setLoading(false);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setItems(data || []);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditing(null); setForm({ name: "", rate: 20, tva_type: "both", is_active: true, sort_order: 0 }); setDialogOpen(true); };
  const openEdit = (item: TvaRate) => { setEditing(item); setForm({ name: item.name, rate: item.rate, tva_type: item.tva_type, is_active: item.is_active, sort_order: item.sort_order }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    if (editing) {
      const { error } = await (supabase as any).from("tva_rates").update(form).eq("id", editing.id);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); setSaving(false); return; }
      toast({ title: "Taux mis à jour" });
    } else {
      const { error } = await (supabase as any).from("tva_rates").insert(form);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); setSaving(false); return; }
      toast({ title: "Taux créé" });
    }
    setSaving(false);
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from("tva_rates").delete().eq("id", id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Taux supprimé" });
    fetchData();
  };

  if (loading) return <AppLayout title="Liste des TVA" subtitle="Paramétrage des taux de TVA"><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AppLayout>;

  return (
    <AppLayout title="Liste des TVA" subtitle="Paramétrage des taux de TVA">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Percent className="h-4 w-4" />
            <span><span className="font-medium text-foreground">{items.filter(i => i.is_active).length}</span> taux actif(s)</span>
          </div>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nouveau taux</Button>
        </div>

        {items.length === 0 ? (
          <EmptyState icon={<Percent className="h-8 w-8" />} title="Aucun taux" description="Ajoutez votre premier taux de TVA." actionLabel="Ajouter" onAction={openCreate} />
        ) : (
          <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Nom</TableHead>
                  <TableHead className="text-right">Taux (%)</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, i) => (
                  <TableRow key={item.id} className={`hover:bg-muted/30 transition-colors ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right font-mono">{item.rate}%</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{TYPE_LABELS[item.tva_type] || item.tva_type}</Badge></TableCell>
                    <TableCell><Badge variant={item.is_active ? "default" : "outline"} className="text-xs">{item.is_active ? "Actif" : "Inactif"}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(item)}><Edit className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Modifier" : "Nouveau taux de TVA"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Nom *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: TVA 20%" autoFocus /></div>
            <div><Label>Pourcentage (%)</Label><Input type="number" step="0.01" value={form.rate} onChange={e => setForm(p => ({ ...p, rate: Number(e.target.value) }))} /></div>
            <div>
              <Label>Type</Label>
              <Select value={form.tva_type} onValueChange={v => setForm(p => ({ ...p, tva_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Les deux</SelectItem>
                  <SelectItem value="sale">Vente</SelectItem>
                  <SelectItem value="purchase">Achat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Ordre</Label><Input type="number" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: Number(e.target.value) }))} /></div>
            <div className="flex items-center justify-between"><Label>Actif</Label><Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{editing ? "Enregistrer" : "Créer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
