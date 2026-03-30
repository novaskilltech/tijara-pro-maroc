import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useCompany, Company } from "@/hooks/useCompany";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, Save, Upload, Loader2, Plus, X, Check, Edit2, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { validateEmail, normalizeEmail } from "@/lib/email-validation";

const formes = ["SARL", "SA", "SAS", "SARLAU", "SNC", "Auto-entrepreneur", "Autre"];

function Field({ label, value, onChange, type = "text", className = "" }: {
  label: string; value?: string | null; onChange: (v: string) => void; type?: string; className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label>{label}</Label>
      <Input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

const emptyForm = (): Partial<Company> => ({
  raison_sociale: "",
  forme_juridique: "SARL",
  ice: "", if_number: "", rc: "", patente: "", cnss: "",
  capital: 0, address: "", city: "", postal_code: "",
  phone: "", fax: "", email: "", website: "", logo_url: null,
});

export default function CompaniesPage() {
  const { companies, loading, createCompany, updateCompany, refetch, activeCompany, switchCompany } = useCompany();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Company>>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const set = (key: keyof Company, value: string | number | null) =>
    setForm(p => ({ ...p, [key]: value }));

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (c: Company) => {
    setEditId(c.id);
    setForm({ ...c });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.raison_sociale?.trim()) {
      toast({ title: "Erreur", description: "La raison sociale est obligatoire.", variant: "destructive" });
      return;
    }

    // Email validation
    if (form.email) {
      const err = validateEmail(form.email);
      if (err) {
        toast({ title: "Erreur", description: err, variant: "destructive" });
        return;
      }
      form.email = normalizeEmail(form.email);
    }

    setSaving(true);
    let ok: boolean;
    if (editId) {
      ok = await updateCompany(editId, form);
    } else {
      ok = await createCompany(form);
    }
    if (ok) {
      setDialogOpen(false);
      // If creating, auto-add current user to new company
      if (!editId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Get latest company id
          const { data: newCo } = await (supabase as any)
            .from("companies")
            .select("id")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (newCo?.id) {
            await (supabase as any).from("user_companies").insert({
              user_id: user.id, company_id: newCo.id, is_default: false
            });
          }
        }
      }
      await refetch();
    }
    setSaving(false);
  };

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `logo-${editId || "new"}.${ext}`;
    const { error } = await supabase.storage.from("company-assets").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Erreur upload", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("company-assets").getPublicUrl(path);
    set("logo_url", urlData.publicUrl);
    setUploading(false);
  };

  const handleDeleteClick = (c: Company) => {
    setCompanyToDelete(c.id);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!companyToDelete) return;
    // Check if company has any related data before deleting
    const { data: users } = await (supabase as any)
      .from("user_companies")
      .select("id")
      .eq("company_id", companyToDelete);

    if (users && users.length > 0) {
      toast({
        title: "Suppression impossible",
        description: "Cette société a des utilisateurs associés. Supprimez-les d'abord.",
        variant: "destructive"
      });
      setDeleteConfirmOpen(false);
      setCompanyToDelete(null);
      return;
    }

    const { error } = await (supabase as any)
      .from("companies")
      .delete()
      .eq("id", companyToDelete);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Société supprimée", description: "La société a été supprimée avec succès." });
      await refetch();
    }
    setDeleteConfirmOpen(false);
    setCompanyToDelete(null);
  };

  return (
    <AppLayout title="Gestion des Sociétés" subtitle="Créez et gérez plusieurs sociétés">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Sociétés ({companies.length})</h2>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Nouvelle société
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map(c => (
              <Card key={c.id} className={`relative transition-all ${activeCompany?.id === c.id ? "ring-2 ring-primary" : ""}`}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    {c.logo_url ? (
                      <img src={c.logo_url} alt="Logo" className="h-10 w-10 object-contain rounded-lg border border-border shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{c.raison_sociale}</p>
                      <p className="text-xs text-muted-foreground">{c.forme_juridique}</p>
                      {c.city && <p className="text-xs text-muted-foreground">{c.city}</p>}
                    </div>
                    {activeCompany?.id === c.id && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">Active</Badge>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => openEdit(c)}>
                      <Edit2 className="h-3.5 w-3.5" />
                      Modifier
                    </Button>
                    {activeCompany?.id !== c.id && (
                      <>
                        <Button size="sm" className="flex-1 gap-1" onClick={() => switchCompany(c)}>
                          <Check className="h-3.5 w-3.5" />
                          Activer
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteClick(c)}
                          title="Supprimer la société"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Modifier la société" : "Nouvelle société"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-2">
            {/* Logo */}
            <div className="flex items-center gap-5">
              {form.logo_url ? (
                <img src={form.logo_url} alt="Logo" className="h-16 w-16 object-contain rounded-lg border border-border" />
              ) : (
                <div className="h-16 w-16 rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground text-xs">Logo</div>
              )}
              <div>
                <input type="file" accept="image/*" ref={fileRef} className="hidden" onChange={handleLogo} />
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                  {uploading ? "Upload…" : "Logo"}
                </Button>
              </div>
            </div>

            {/* Identity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Raison sociale *" value={form.raison_sociale} onChange={v => set("raison_sociale", v)} className="md:col-span-2" />
              <div className="space-y-2">
                <Label>Forme juridique</Label>
                <Select value={form.forme_juridique || ""} onValueChange={v => set("forme_juridique", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{formes.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Field label="Capital (MAD)" value={String(form.capital || "")} onChange={v => set("capital", Number(v))} type="number" />
              <Field label="ICE" value={form.ice} onChange={v => set("ice", v)} />
              <Field label="IF" value={form.if_number} onChange={v => set("if_number", v)} />
              <Field label="RC" value={form.rc} onChange={v => set("rc", v)} />
              <Field label="Patente" value={form.patente} onChange={v => set("patente", v)} />
              <Field label="CNSS" value={form.cnss} onChange={v => set("cnss", v)} />
            </div>

            <Separator />

            {/* Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Adresse" value={form.address} onChange={v => set("address", v)} className="md:col-span-2" />
              <Field label="Ville" value={form.city} onChange={v => set("city", v)} />
              <Field label="Code postal" value={form.postal_code} onChange={v => set("postal_code", v)} />
              <Field label="Téléphone" value={form.phone} onChange={v => set("phone", v)} />
              <Field label="Email" value={form.email} onChange={v => set("email", v)} />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer la société</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Êtes-vous sûr de vouloir supprimer cette société ? Cette action est irréversible.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
