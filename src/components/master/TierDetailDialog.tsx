import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle, Building2, Landmark, Users, History, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ContactsList } from "./ContactsList";
import { AuditLogViewer } from "@/components/system/AuditLogViewer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { validateEmail, normalizeEmail } from "@/lib/email-validation";
import { useBanks } from "@/hooks/useBanks";

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
  const { banks } = useBanks();
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
        bank_id: "", bank_id_temp: "", rib: "", account_number: "", iban: "", swift: "",
        contact_name: "", phone: "", phone2: "", email: "", company_email: "", fax: "", notes: "",
        entity_type: "morale",
      });
    } else {
      setForm({ 
        ...data,
        entity_type: data.entity_type || "morale",
        bank_id: data.bank_id || "" 
      });
    }
    setTab("general");
  };

  // Synchronize internal state when props change
  useEffect(() => {
    if (open) {
      if (item) initForm(item);
      else if (isNew) initForm(null);
    }
  }, [open, item, isNew]);

  const set = (key: string, val: any) => setForm((f) => ({ ...f, [key]: val }));

  const handleToggleBlocked = async () => {
    const newActive = !form.is_active;
    if (newActive === true) {
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

  const handleSave = async () => {
    if (!form.code || !form.name) {
      toast.error("Le code et le nom sont obligatoires.");
      return;
    }

    if (form.entity_type === "morale") {
      if (!form.ice) { toast.error("L'ICE est obligatoire pour une personne morale."); return; }
      if (!form.rc) { toast.error("Le RC est obligatoire pour une personne morale."); return; }
      if (!form.if_number) { toast.error("L'IF est obligatoire pour une personne morale."); return; }
    }
    if (form.email) {
      const err = validateEmail(form.email);
      if (err) {
        setTab("contact");
        toast.error("Email contact : " + err);
        return;
      }
      form.email = normalizeEmail(form.email);
    }
    
    if (form.company_email) {
      const err = validateEmail(form.company_email);
      if (err) {
        setTab("general");
        toast.error("Email société : " + err);
        return;
      }
      form.company_email = normalizeEmail(form.company_email);
    }
    setSaving(true);

    if (item && item.is_active !== form.is_active) {
      await (supabase as any).from("audit_logs").insert({
        user_id: user?.id,
        action: form.is_active ? "unblock" : "block",
        table_name: type === "client" ? "customers" : "suppliers",
        record_id: item.id,
        details: `${label} ${form.name} ${form.is_active ? "débloqué" : "bloqué"}`,
      });
    }

    const { bank_name, ...payload } = form;
    // ensure we don't send legacy bank_name if bank_id is set
    const ok = await onSave(payload);
    setSaving(false);
    if (ok) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

        {!isNew && isBlocked && (
          <div className="mx-6 mt-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <div className="text-sm text-destructive">
              <span className="font-semibold">Ce {label.toLowerCase()} est bloqué.</span> Aucune opération commerciale ne peut être effectuée.
            </div>
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab} className="px-6 pt-4">
          <TabsList className={`w-full grid mb-4 ${isNew ? 'grid-cols-2' : 'grid-cols-3'}`}>
            <TabsTrigger value="general" className="gap-1.5 text-xs">
              <Building2 className="h-3.5 w-3.5" />
              Général
            </TabsTrigger>
            <TabsTrigger value="bank" className="gap-1.5 text-xs">
              <Landmark className="h-3.5 w-3.5" />
              Bancaire
            </TabsTrigger>
            {!isNew && (
              <TabsTrigger value="history" className="gap-1.5 text-xs">
                <History className="h-3.5 w-3.5" />
                Audit
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="general" className="mt-0 space-y-6 pb-4">
            <div className="bg-muted/30 p-4 rounded-lg space-y-4">
              <Field label="Type d'entité">
                <RadioGroup 
                  value={form.entity_type || "morale"} 
                  onValueChange={(v) => set("entity_type", v)}
                  className="flex items-center gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="morale" id="morale" />
                    <Label htmlFor="morale" className="flex items-center gap-1.5 cursor-pointer">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" /> Personne Morale
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="physique" id="physique" />
                    <Label htmlFor="physique" className="flex items-center gap-1.5 cursor-pointer">
                      <User className="h-3.5 w-3.5 text-muted-foreground" /> Personne Physique
                    </Label>
                  </div>
                </RadioGroup>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Code *">
                <Input value={form.code || ""} onChange={(e) => set("code", e.target.value)} placeholder={type === "client" ? "CLI-001" : "FRN-001"} />
              </Field>
              <Field label={type === "client" ? "Nom du client *" : "Nom fournisseur *"}>
                <Input value={form.name || ""} onChange={(e) => set("name", e.target.value)} placeholder="Raison sociale" />
              </Field>
              <Field label={form.entity_type === "morale" ? "ICE *" : "ICE"}>
                <Input value={form.ice || ""} onChange={(e) => set("ice", e.target.value)} placeholder="ICE" />
              </Field>
              <Field label={form.entity_type === "morale" ? "RC *" : "RC"}>
                <Input value={form.rc || ""} onChange={(e) => set("rc", e.target.value)} placeholder="RC" />
              </Field>
              <Field label={form.entity_type === "morale" ? "IF *" : "IF"}>
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
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  rows={2}
                />
              </Field>
              <Field label="Ville">
                <Input value={form.city || ""} onChange={(e) => set("city", e.target.value)} placeholder="Casablanca" />
              </Field>
              <Field label="Email société">
                <Input 
                  type="email" 
                  value={form.company_email || ""} 
                  onChange={(e) => set("company_email", e.target.value)} 
                  placeholder="contact@societe.ma" 
                />
              </Field>
              <Field label="Plafond crédit (MAD)">
                <Input type="number" value={form.credit_limit || 0} onChange={(e) => set("credit_limit", Number(e.target.value))} placeholder="50000" />
              </Field>
              <Field label="Conditions de paiement">
                <Select value={form.payment_terms || "30j"} onValueChange={(v) => set("payment_terms", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </TabsContent>

          <TabsContent value="bank" className="mt-0 space-y-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Banque" span2>
                <Select 
                  value={form.bank_id || "none"} 
                  onValueChange={(v) => {
                    if (v === "none") {
                      set("bank_id", null);
                    } else {
                      set("bank_id", v);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choisir une banque..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune</SelectItem>
                    {banks.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="RIB" span2>
                <Input value={form.rib || ""} onChange={(e) => set("rib", e.target.value)} placeholder="000 000 0000000000000000 00" className="font-mono tracking-wider" />
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

        <div className="mx-6 mt-2 mb-0 flex items-center justify-between border-t border-border pt-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={form.is_active !== false}
              onCheckedChange={handleToggleBlocked}
            />
            <span className={`text-sm font-medium ${isBlocked ? "text-destructive" : "text-foreground"}`}>
              {isBlocked ? "Bloqué (Désactivé)" : "Actif"}
            </span>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving} className="min-w-[100px]">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isNew ? "Créer" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
