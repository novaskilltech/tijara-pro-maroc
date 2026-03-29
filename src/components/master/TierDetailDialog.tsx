import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, AlertTriangle, Building2, Landmark, Users, History } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ContactsList } from "./ContactsList";
import { AuditLogViewer } from "@/components/system/AuditLogViewer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateEmail, normalizeEmail } from "@/lib/email-validation";

interface TierDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Record<string, any> | null;
  isNew: boolean;
  type: "client" | "supplier";
  onSave: (data: Record<string, any>) => Promise<boolean>;
}

const PAYMENT_OPTIONS = [
  { value: "comptant", label: "Comptant" },
  { value: "30j", label: "30 jours" },
  { value: "60j", label: "60 jours" },
  { value: "90j", label: "90 jours" },
];

function Field({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <div className={span2 ? "sm:col-span-2" : ""}>
      <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}

export function TierDetailDialog({ open, onOpenChange, item, isNew, type, onSave }: TierDetailDialogProps) {
  const { user } = useAuth();
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("general");

  const label = type === "client" ? "Client" : "Fournisseur";
  const isBlocked = form.is_active === false;

  // Initialize form when item changes
  const initForm = (data: Record<string, any> | null) => {
    if (!data) {
      setForm({
        code: "", name: "", ice: "", rc: "", if_number: "", patente: "",
        address: "", city: "", credit_limit: 0, payment_terms: "30j", is_active: true,
        bank_name: "", rib: "", account_number: "", iban: "", swift: "",
        contact_name: "", phone: "", phone2: "", email: "", fax: "", notes: "",
      });
    } else {
      setForm({ ...data });
    }
    setTab("general");
  };

  // We need to re-init when dialog opens with new item
  const handleOpenChange = (v: boolean) => {
    if (v && item) initForm(item);
    else if (v && isNew) initForm(null);
    onOpenChange(v);
  };

  // Also init on first open
  if (open && Object.keys(form).length === 0) {
    initForm(item);
  }

  const set = (key: string, val: any) => setForm((f) => ({ ...f, [key]: val }));

  const handleToggleBlocked = async () => {
    // Only admin can unblock
    const newActive = !form.is_active;
    if (newActive === true) {
      // Unblocking - check admin
      const { data: roles } = await (supabase as any)
        .from("user_roles")
        .select("role")
        .eq("user_id", user?.id);
      const isAdmin = roles?.some((r: any) => ["super_admin", "admin"].includes(r.role));
      if (!isAdmin) {
        toast.error("Seul un administrateur peut débloquer ce " + label.toLowerCase() + ".");
        return;
      }
    }
    set("is_active", newActive);
  };

  const [emailError, setEmailError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!form.code || !form.name) {
      toast.error("Le code et le nom sont obligatoires.");
      return;
    }
    // Email validation
    if (form.email) {
      const err = validateEmail(form.email);
      if (err) {
        setEmailError(err);
        setTab("contact");
        toast.error(err);
        return;
      }
      form.email = normalizeEmail(form.email);
    }
    setEmailError(null);
    setSaving(true);

    // Log status change if it changed
    if (item && item.is_active !== form.is_active) {
      await (supabase as any).from("audit_logs").insert({
        user_id: user?.id,
        action: form.is_active ? "unblock" : "block",
        table_name: type === "client" ? "customers" : "suppliers",
        record_id: item.id,
        details: `${label} ${form.name} ${form.is_active ? "débloqué" : "bloqué"}`,
      });
    }

    const ok = await onSave(form);
    setSaving(false);
    if (ok) {
      onOpenChange(false);
      setForm({});
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[92vw] md:max-w-[700px] lg:max-w-[750px] max-h-[88vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <div className="flex items-center gap-3">
            <DialogTitle className="text-lg">{isNew ? "Nouveau" : "Fiche"} {label}</DialogTitle>
            {!isNew && isBlocked && (
              <Badge variant="destructive" className="text-xs px-2 py-0.5">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {label} Bloqué
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Blocked warning banner */}
        {!isNew && isBlocked && (
          <div className="mx-6 mt-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <div className="text-sm text-destructive">
              <span className="font-semibold">Ce {label.toLowerCase()} est bloqué.</span> Aucune opération commerciale ne peut être effectuée (devis, commandes, factures, livraisons).
            </div>
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab} className="px-6 pt-4">
          <TabsList className={`w-full grid mb-4 ${isNew ? 'grid-cols-3' : 'grid-cols-4'}`}>
            <TabsTrigger value="general" className="gap-1.5 text-xs">
              <Building2 className="h-3.5 w-3.5" />
              Infos Générales
            </TabsTrigger>
            <TabsTrigger value="bank" className="gap-1.5 text-xs">
              <Landmark className="h-3.5 w-3.5" />
              Infos Bancaires
            </TabsTrigger>
            <TabsTrigger value="contacts_list" className="gap-1.5 text-xs" disabled={isNew}>
              <Users className="h-3.5 w-3.5" />
              Contacts
            </TabsTrigger>
            {!isNew && (
              <TabsTrigger value="history" className="gap-1.5 text-xs">
                <History className="h-3.5 w-3.5" />
                Historique
              </TabsTrigger>
            )}
          </TabsList>

          {/* TAB 1: General */}
          <TabsContent value="general" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Code *">
                <Input value={form.code || ""} onChange={(e) => set("code", e.target.value)} placeholder={type === "client" ? "CLI-001" : "FRN-001"} />
              </Field>
              <Field label={type === "client" ? "Nom du client *" : "Nom fournisseur *"}>
                <Input value={form.name || ""} onChange={(e) => set("name", e.target.value)} placeholder="Raison sociale" />
              </Field>
              <Field label="ICE">
                <Input value={form.ice || ""} onChange={(e) => set("ice", e.target.value)} placeholder="ICE" />
              </Field>
              <Field label="RC">
                <Input value={form.rc || ""} onChange={(e) => set("rc", e.target.value)} placeholder="RC" />
              </Field>
              <Field label="IF">
                <Input value={form.if_number || ""} onChange={(e) => set("if_number", e.target.value)} placeholder="Identifiant Fiscal" />
              </Field>
              <Field label="Patente">
                <Input value={form.patente || ""} onChange={(e) => set("patente", e.target.value)} placeholder="Patente" />
              </Field>
              <Field label="Adresse" span2>
                <textarea
                  value={form.address || ""}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="Adresse complète"
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  rows={2}
                />
              </Field>
              <Field label="Ville">
                <Input value={form.city || ""} onChange={(e) => set("city", e.target.value)} placeholder="Casablanca" />
              </Field>
              <Field label="Plafond crédit (MAD)">
                <Input type="number" value={form.credit_limit || 0} onChange={(e) => set("credit_limit", Number(e.target.value))} placeholder="50000" />
              </Field>
              <Field label="Conditions de paiement">
                <select
                  value={form.payment_terms || "30j"}
                  onChange={(e) => set("payment_terms", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {PAYMENT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Statut">
                <div className="flex items-center gap-3 h-10">
                  <Switch
                    checked={form.is_active !== false}
                    onCheckedChange={handleToggleBlocked}
                  />
                  <span className={`text-sm font-medium ${isBlocked ? "text-destructive" : "text-foreground"}`}>
                    {isBlocked ? "Bloqué" : "Actif"}
                  </span>
                </div>
              </Field>
            </div>
          </TabsContent>

          {/* TAB 2: Banking */}
          <TabsContent value="bank" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Banque">
                <Input value={form.bank_name || ""} onChange={(e) => set("bank_name", e.target.value)} placeholder="Nom de la banque" />
              </Field>
              <Field label="RIB">
                <Input value={form.rib || ""} onChange={(e) => set("rib", e.target.value)} placeholder="RIB complet" />
              </Field>
              <Field label="Numéro de compte">
                <Input value={form.account_number || ""} onChange={(e) => set("account_number", e.target.value)} placeholder="N° de compte" />
              </Field>
              <Field label="IBAN">
                <Input value={form.iban || ""} onChange={(e) => set("iban", e.target.value)} placeholder="IBAN (optionnel)" />
              </Field>
              <Field label="Swift">
                <Input value={form.swift || ""} onChange={(e) => set("swift", e.target.value)} placeholder="Code SWIFT (optionnel)" />
              </Field>
            </div>
          </TabsContent>

          {/* TAB 3: Contacts List */}
          <TabsContent value="contacts_list" className="mt-0">
            <ContactsList tierId={item?.id || null} tierType={type} />
          </TabsContent>

          {/* TAB 4: History */}
          {!isNew && item && (
            <TabsContent value="history" className="mt-0 h-[400px]">
              <div className="bg-card border rounded-md h-full overflow-hidden">
                <AuditLogViewer 
                  tableName={type === "client" ? "customers" : "suppliers"} 
                  recordId={item.id} 
                  companyId={null}
                />
              </div>
            </TabsContent>
          )}
        </Tabs>

        <DialogFooter className="px-6 pb-6 pt-4">
          <Button variant="outline" onClick={() => { onOpenChange(false); setForm({}); }}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isNew ? "Créer" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
