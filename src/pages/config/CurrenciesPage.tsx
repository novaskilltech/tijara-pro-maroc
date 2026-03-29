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
import { EmptyState } from "@/components/EmptyState";
import { Plus, Edit, Trash2, Loader2, Coins, Star } from "lucide-react";

interface Currency {
  id: string;
  code: string;
  symbol: string;
  name: string;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
}

export default function CurrenciesPage() {
  const [items, setItems] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Currency | null>(null);
  const [form, setForm] = useState({ code: "", symbol: "", name: "", is_active: true, is_default: false, sort_order: 0 });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).from("currencies").select("*").order("sort_order").order("code");
    setLoading(false);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setItems(data || []);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => { setEditing(null); setForm({ code: "", symbol: "", name: "", is_active: true, is_default: false, sort_order: 0 }); setDialogOpen(true); };
  const openEdit = (item: Currency) => { setEditing(item); setForm({ code: item.code, symbol: item.symbol, name: item.name, is_active: item.is_active, is_default: item.is_default, sort_order: item.sort_order }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.code.trim()) return;
    setSaving(true);
    // If setting as default, clear others first
    if (form.is_default) {
      await (supabase as any).from("currencies").update({ is_default: false }).eq("is_default", true);
    }
    if (editing) {
      const { error } = await (supabase as any).from("currencies").update(form).eq("id", editing.id);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); setSaving(false); return; }
      toast({ title: "Devise mise à jour" });
    } else {
      const { error } = await (supabase as any).from("currencies").insert(form);
      if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); setSaving(false); return; }
      toast({ title: "Devise créée" });
    }
    setSaving(false);
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from("currencies").delete().eq("id", id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Devise supprimée" });
    fetchData();
  };

  if (loading) return <AppLayout title="Devises" subtitle="Paramétrage des devises"><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AppLayout>;

  return (
    <AppLayout title="Devises" subtitle="Paramétrage des devises">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Coins className="h-4 w-4" />
            <span><span className="font-medium text-foreground">{items.filter(i => i.is_active).length}</span> devise(s) active(s)</span>
          </div>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nouvelle devise</Button>
        </div>

        {items.length === 0 ? (
          <EmptyState icon={<Coins className="h-8 w-8" />} title="Aucune devise" description="Ajoutez votre première devise." actionLabel="Ajouter" onAction={openCreate} />
        ) : (
          <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Code</TableHead>
                  <TableHead>Symbole</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, i) => (
                  <TableRow key={item.id} className={`hover:bg-muted/30 transition-colors ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                    <TableCell className="font-mono font-medium">
                      {item.code}
                      {item.is_default && <Star className="h-3 w-3 text-warning inline ml-1.5 fill-current" />}
                    </TableCell>
                    <TableCell>{item.symbol}</TableCell>
                    <TableCell>{item.name}</TableCell>
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
          <DialogHeader><DialogTitle>{editing ? "Modifier" : "Nouvelle devise"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Code *</Label><Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="Ex: MAD" className="font-mono" autoFocus /></div>
            <div><Label>Symbole</Label><Input value={form.symbol} onChange={e => setForm(p => ({ ...p, symbol: e.target.value }))} placeholder="Ex: MAD, €, $" /></div>
            <div><Label>Nom</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Dirham marocain" /></div>
            <div><Label>Ordre</Label><Input type="number" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: Number(e.target.value) }))} /></div>
            <div className="flex items-center justify-between"><Label>Par défaut</Label><Switch checked={form.is_default} onCheckedChange={v => setForm(p => ({ ...p, is_default: v }))} /></div>
            <div className="flex items-center justify-between"><Label>Actif</Label><Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !form.code.trim()}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{editing ? "Enregistrer" : "Créer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
