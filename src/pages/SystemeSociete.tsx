import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useCompanySettings, useCompanyBankAccounts, CompanyBankAccount } from "@/hooks/useCompanySettings";
import { useCompany } from "@/hooks/useCompany";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Save, Upload, Loader2, Plus, Pencil, Trash2, Star, Landmark, FileText } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CompanySettings } from "@/hooks/useCompanySettings";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const formes = ["SARL", "SA", "SAS", "SARLAU", "SNC", "Auto-entrepreneur", "Autre"];

const emptyBank: Partial<CompanyBankAccount> = {
  bank_name: "",
  account_name: "",
  account_number: "",
  rib: "",
  swift: "",
  currency: "MAD",
  is_default: false,
  is_active: true,
};

const SystemeSociete = () => {
  const { settings, loading, update, uploadLogo } = useCompanySettings();
  const { refetch: refetchCompany } = useCompany();
  const {
    accounts,
    loading: bankLoading,
    createAccount,
    updateAccount,
    deleteAccount,
    setDefault,
  } = useCompanyBankAccounts();

  const [form, setForm] = useState<Partial<CompanySettings>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Bank dialog state
  const [bankDialog, setBankDialog] = useState(false);
  const [editingBank, setEditingBank] = useState<CompanyBankAccount | null>(null);
  const [bankForm, setBankForm] = useState<Partial<CompanyBankAccount>>(emptyBank);
  const [savingBank, setSavingBank] = useState(false);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const set = (key: keyof CompanySettings, value: string | number) =>
    setForm((p) => ({ ...p, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    await update(form);
    setSaving(false);
  };

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    e.target.value = "";
    setUploading(true);
    const url = await uploadLogo(file);
    if (url) {
      // Update form state with new URL
      const updatedForm = { ...form, logo_url: url };
      setForm(updatedForm);
      // Persist to DB with correct logo_url (not stale form)
      await update(updatedForm);
      // Refresh company context so sidebar logo updates immediately
      await refetchCompany();
    }
    setUploading(false);
  };

  const openNewBank = () => {
    setEditingBank(null);
    setBankForm({ ...emptyBank });
    setBankDialog(true);
  };

  const openEditBank = (acc: CompanyBankAccount) => {
    setEditingBank(acc);
    setBankForm({ ...acc });
    setBankDialog(true);
  };

  const handleSaveBank = async () => {
    setSavingBank(true);
    if (editingBank) {
      await updateAccount(editingBank.id, bankForm);
    } else {
      await createAccount(bankForm);
    }
    setSavingBank(false);
    setBankDialog(false);
  };

  const setB = (key: keyof CompanyBankAccount, value: string | boolean) =>
    setBankForm((p) => ({ ...p, [key]: value }));

  if (loading) {
    return (
      <AppLayout title="Paramètres Société" subtitle="Informations légales et fiscales">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Paramètres Société" subtitle="Informations légales et fiscales de l'entreprise">
      <div className="space-y-6 max-w-4xl">
        {/* Logo */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Building2 className="h-5 w-5" /> Logo de l'entreprise</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-6">
            {form.logo_url ? (
              <img src={form.logo_url} alt="Logo" className="h-20 w-20 object-contain rounded-lg border border-border" />
            ) : (
              <div className="h-20 w-20 rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground text-xs">Aucun</div>
            )}
            <div>
              <input type="file" accept="image/*" ref={fileRef} className="hidden" onChange={handleLogo} />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                {uploading ? "Upload…" : "Changer le logo"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Identité */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Identité de l'entreprise</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Raison sociale" value={form.raison_sociale} onChange={(v) => set("raison_sociale", v)} />
            <div className="space-y-2">
              <Label>Forme juridique</Label>
              <Select value={form.forme_juridique || ""} onValueChange={(v) => set("forme_juridique", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{formes.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Field label="Capital (MAD)" value={String(form.capital || "")} onChange={(v) => set("capital", Number(v))} type="number" />
          </CardContent>
        </Card>

        {/* Identifiants fiscaux */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Identifiants fiscaux</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="ICE" value={form.ice} onChange={(v) => set("ice", v)} />
            <Field label="IF (Identifiant fiscal)" value={form.if_number} onChange={(v) => set("if_number", v)} />
            <Field label="RC (Registre de commerce)" value={form.rc} onChange={(v) => set("rc", v)} />
            <Field label="Patente" value={form.patente} onChange={(v) => set("patente", v)} />
            <Field label="CNSS" value={form.cnss} onChange={(v) => set("cnss", v)} />
          </CardContent>
        </Card>

        {/* Coordonnées */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Coordonnées</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Adresse" value={form.address} onChange={(v) => set("address", v)} className="md:col-span-2" />
            <Field label="Ville" value={form.city} onChange={(v) => set("city", v)} />
            <Field label="Code postal" value={form.postal_code} onChange={(v) => set("postal_code", v)} />
            <Field label="Téléphone" value={form.phone} onChange={(v) => set("phone", v)} />
            <Field label="Fax" value={form.fax} onChange={(v) => set("fax", v)} />
            <Field label="Email" value={form.email} onChange={(v) => set("email", v)} />
            <Field label="Site web" value={form.website} onChange={(v) => set("website", v)} />
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><FileText className="h-5 w-5" /> Documents</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>Mentions légales (Pied de page PDF)</Label>
              <Textarea 
                value={form.legal_mentions || ""} 
                onChange={(e) => set("legal_mentions", e.target.value)} 
                placeholder="Ex: Capital de 100.000 DH - RC 12345 - IF 67890 - Patente 112233"
                className="min-h-[100px] text-sm"
              />
              <p className="text-[11px] text-muted-foreground italic">Ces mentions apparaîtront en bas de chaque document (Devis, BL, Facture...)</p>
            </div>
          </CardContent>
        </Card>

        {/* Comptes bancaires */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Landmark className="h-5 w-5" />
              Comptes bancaires
            </CardTitle>
            <Button size="sm" onClick={openNewBank}>
              <Plus className="h-4 w-4 mr-1" /> Ajouter un compte
            </Button>
          </CardHeader>
          <CardContent>
            {bankLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-border rounded-lg">
                <Landmark className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-muted-foreground text-sm mb-3">Aucun compte bancaire configuré</p>
                <Button size="sm" variant="outline" onClick={openNewBank}>
                  <Plus className="h-4 w-4 mr-1" /> Ajouter un compte bancaire
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${acc.is_default ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{acc.bank_name}</span>
                        {acc.is_default && <Badge variant="default" className="text-[10px]">Par défaut</Badge>}
                        <span className="text-xs text-muted-foreground">{acc.currency}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 space-x-3">
                        {acc.account_name && <span>{acc.account_name}</span>}
                        {acc.rib && <span>RIB: {acc.rib}</span>}
                        {acc.swift && <span>SWIFT: {acc.swift}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!acc.is_default && (
                        <Button size="icon" variant="ghost" title="Définir par défaut" onClick={() => setDefault(acc.id)}>
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => openEditBank(acc)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteAccount(acc.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="min-w-[160px]">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </div>

      {/* Bank account dialog */}
      <Dialog open={bankDialog} onOpenChange={setBankDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBank ? "Modifier le compte bancaire" : "Ajouter un compte bancaire"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Banque *</Label>
              <Input value={bankForm.bank_name || ""} onChange={(e) => setB("bank_name", e.target.value)} placeholder="ex: Attijariwafa Bank" />
            </div>
            <div className="space-y-2">
              <Label>Intitulé du compte</Label>
              <Input value={bankForm.account_name || ""} onChange={(e) => setB("account_name", e.target.value)} placeholder="ex: Compte principal" />
            </div>
            <div className="space-y-2">
              <Label>RIB</Label>
              <Input value={bankForm.rib || ""} onChange={(e) => setB("rib", e.target.value)} placeholder="000 000 0000000000000000 00" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>N° de compte</Label>
                <Input value={bankForm.account_number || ""} onChange={(e) => setB("account_number", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>SWIFT / BIC</Label>
                <Input value={bankForm.swift || ""} onChange={(e) => setB("swift", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Devise</Label>
              <Select value={bankForm.currency || "MAD"} onValueChange={(v) => setB("currency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MAD">MAD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBankDialog(false)}>Annuler</Button>
            <Button onClick={handleSaveBank} disabled={savingBank || !bankForm.bank_name}>
              {savingBank ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

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

export default SystemeSociete;
