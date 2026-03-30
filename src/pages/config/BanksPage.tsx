import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { Plus, Edit, Trash2, Loader2, Building, Search, Landmark } from "lucide-react";
import { useBanks, Bank } from "@/hooks/useBanks";

export default function BanksPage() {
  const { banks, loading, createBank, updateBank, deleteBank } = useBanks();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Bank | null>(null);
  const [form, setForm] = useState({ name: "", code: "", is_active: true });
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredBanks = banks.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (b.code?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  const openCreate = () => { 
    setEditing(null); 
    setForm({ name: "", code: "", is_active: true }); 
    setDialogOpen(true); 
  };
  
  const openEdit = (item: Bank) => { 
    setEditing(item); 
    setForm({ name: item.name, code: item.code || "", is_active: item.is_active }); 
    setDialogOpen(true); 
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = { ...form, code: form.code.trim() || null };
    
    let success = false;
    if (editing) {
      success = !!(await updateBank(editing.id, payload));
    } else {
      success = !!(await createBank(payload));
    }
    
    setSaving(false);
    if (success) {
      setDialogOpen(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette banque ?")) {
      await deleteBank(id);
    }
  };

  return (
    <AppLayout 
      title="Banques" 
      subtitle="Gestion des établissements bancaires pour vos tiers"
    >
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher une banque..." 
              className="pl-10" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={openCreate} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" /> 
            Nouvelle banque
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="relative">
              <div className="h-12 w-12 rounded-full border-t-2 border-primary animate-spin" />
              <Landmark className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground animate-pulse">Chargement des banques...</p>
          </div>
        ) : filteredBanks.length === 0 ? (
          <div className="py-12">
            <EmptyState 
              icon={<Building className="h-12 w-12 text-muted-foreground/50" />} 
              title={searchQuery ? "Aucun résultat" : "Aucune banque configurée"} 
              description={searchQuery ? "Essayez d'autres mots-clés." : "Commencez par ajouter les banques utilisées par vos clients et fournisseurs."}
              actionLabel={searchQuery ? undefined : "Ajouter une banque"} 
              onAction={searchQuery ? undefined : openCreate} 
            />
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
              <Landmark className="h-4 w-4" />
              <span>
                <span className="font-semibold text-foreground">{banks.length}</span> 
                {banks.length > 1 ? " établissements enregistrés" : " établissement enregistré"}
              </span>
            </div>

            <div className="bg-card rounded-xl border border-border/60 shadow-sm overflow-hidden transition-all hover:shadow-md">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-semibold">Nom de l'établissement</TableHead>
                    <TableHead className="font-semibold">Code / Abréviation</TableHead>
                    <TableHead className="font-semibold">Statut</TableHead>
                    <TableHead className="w-28 text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBanks.map((item) => (
                    <TableRow key={item.id} className="group hover:bg-muted/20 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                            <Building className="h-4 w-4" />
                          </div>
                          <span className="font-medium">{item.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.code ? (
                          <Badge variant="secondary" className="font-mono text-[10px] letter-spacing-tight">
                            {item.code}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">Non défini</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={item.is_active ? "default" : "outline"} 
                          className={`text-[10px] uppercase tracking-wider font-bold h-5 ${item.is_active ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-muted text-muted-foreground"}`}
                        >
                          {item.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/5" 
                            onClick={() => openEdit(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5" 
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md sm:rounded-2xl border-border/60 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              {editing ? <Edit className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
              {editing ? "Modifier la banque" : "Nouvelle banque"}
            </DialogTitle>
            <DialogDescription>
              {editing ? "Mettez à jour les informations de cet établissement." : "Ajoutez un nouvel établissement bancaire à votre référentiel."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="bank-name" className="text-sm font-semibold">Nom de la banque <span className="text-destructive">*</span></Label>
              <Input 
                id="bank-name"
                value={form.name} 
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))} 
                placeholder="Ex: Banque Populaire, BMCE..." 
                className="bg-muted/30 border-muted-foreground/20 focus:bg-background transition-all"
                autoFocus 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-code" className="text-sm font-semibold">Code / Abréviation</Label>
              <Input 
                id="bank-code"
                value={form.code} 
                onChange={e => setForm(p => ({ ...p, code: e.target.value }))} 
                placeholder="Ex: BP, BOA, CIH..." 
                className="font-mono bg-muted/30 border-muted-foreground/20 focus:bg-background transition-all uppercase" 
              />
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/40">
              <div className="space-y-0.5">
                <Label htmlFor="bank-active" className="text-sm font-semibold">Statut actif</Label>
                <p className="text-xs text-muted-foreground">Rendre cette banque disponible dans les listes.</p>
              </div>
              <Switch 
                id="bank-active"
                checked={form.is_active} 
                onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} 
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="hover:bg-muted font-medium">
              Annuler
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || !form.name.trim()} 
              className="px-8 shadow-md transition-all hover:translate-y-[-1px] active:translate-y-[0]"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editing ? "Mettre à jour" : "Créer l'établissement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
