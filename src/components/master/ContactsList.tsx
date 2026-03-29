import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Star, Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "@/hooks/useCompany";

interface Contact {
  id: string;
  full_name: string;
  job_title: string;
  email: string;
  phone: string;
  mobile: string;
  is_primary: boolean;
  notes: string;
}

interface ContactsListProps {
  tierId: string | null;
  tierType: "client" | "supplier";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</Label>
      {children}
    </div>
  );
}

export function ContactsList({ tierId, tierType }: ContactsListProps) {
  const { activeCompany } = useCompany();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingContact, setEditingContact] = useState<Partial<Contact> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const fkColumn = tierType === "client" ? "customer_id" : "supplier_id";

  const fetchContacts = useCallback(async () => {
    if (!tierId) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("contacts")
      .select("*")
      .eq(fkColumn, tierId)
      .order("is_primary", { ascending: false })
      .order("full_name");
    if (!error) setContacts(data || []);
    setLoading(false);
  }, [tierId, fkColumn]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const handleNew = () => {
    setEditingContact({ full_name: "", job_title: "", email: "", phone: "", mobile: "", is_primary: false, notes: "" });
    setIsNew(true);
  };

  const handleEdit = (c: Contact) => {
    setEditingContact({ ...c });
    setIsNew(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from("contacts").delete().eq("id", id);
    if (error) { toast.error("Erreur lors de la suppression"); return; }
    toast.success("Contact supprimé");
    fetchContacts();
  };

  const handleSave = async () => {
    if (!editingContact?.full_name?.trim()) {
      toast.error("Le nom du contact est obligatoire");
      return;
    }
    setSaving(true);
    if (isNew) {
      const payload = {
        ...editingContact,
        [fkColumn]: tierId,
        company_id: activeCompany?.id || undefined,
      };
      const { error } = await (supabase as any).from("contacts").insert(payload);
      if (error) { toast.error("Erreur lors de la création"); setSaving(false); return; }
      toast.success("Contact ajouté");
    } else {
      const { id, ...updates } = editingContact as Contact;
      const { error } = await (supabase as any).from("contacts").update(updates).eq("id", id);
      if (error) { toast.error("Erreur lors de la mise à jour"); setSaving(false); return; }
      toast.success("Contact mis à jour");
    }
    setSaving(false);
    setEditingContact(null);
    fetchContacts();
  };

  const handleCancel = () => { setEditingContact(null); };

  const set = (key: string, val: any) => setEditingContact((c) => c ? { ...c, [key]: val } : c);

  if (!tierId) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Enregistrez d'abord le {tierType === "client" ? "client" : "fournisseur"} pour ajouter des contacts.
      </div>
    );
  }

  if (editingContact) {
    return (
      <div className="space-y-4">
        <h4 className="text-sm font-semibold">{isNew ? "Nouveau contact" : "Modifier le contact"}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Nom complet *">
            <Input value={editingContact.full_name || ""} onChange={(e) => set("full_name", e.target.value)} placeholder="Nom et prénom" />
          </Field>
          <Field label="Fonction">
            <Input value={editingContact.job_title || ""} onChange={(e) => set("job_title", e.target.value)} placeholder="Directeur commercial..." />
          </Field>
          <Field label="Email">
            <Input type="email" value={editingContact.email || ""} onChange={(e) => set("email", e.target.value)} placeholder="email@exemple.ma" />
          </Field>
          <Field label="Téléphone">
            <Input value={editingContact.phone || ""} onChange={(e) => set("phone", e.target.value)} placeholder="+212..." />
          </Field>
          <Field label="Mobile">
            <Input value={editingContact.mobile || ""} onChange={(e) => set("mobile", e.target.value)} placeholder="+212..." />
          </Field>
          <Field label="Contact principal">
            <div className="flex items-center gap-2 h-10">
              <Switch checked={editingContact.is_primary || false} onCheckedChange={(v) => set("is_primary", v)} />
              <span className="text-sm">{editingContact.is_primary ? "Oui" : "Non"}</span>
            </div>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <textarea
                value={editingContact.notes || ""}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Notes..."
                className="flex min-h-[50px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={2}
              />
            </Field>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel}>Annuler</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
            {isNew ? "Ajouter" : "Enregistrer"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{contacts.length} contact(s)</span>
        <Button size="sm" variant="outline" onClick={handleNew} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Ajouter
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <UserRound className="h-8 w-8 mx-auto mb-2 opacity-40" />
          Aucun contact enregistré
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map((c) => (
            <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
              <div className="flex-shrink-0 mt-0.5">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserRound className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{c.full_name}</span>
                  {c.is_primary && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
                      <Star className="h-2.5 w-2.5" /> Principal
                    </Badge>
                  )}
                </div>
                {c.job_title && <p className="text-xs text-muted-foreground">{c.job_title}</p>}
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                  {c.email && <span>{c.email}</span>}
                  {c.phone && <span>Tél: {c.phone}</span>}
                  {c.mobile && <span>Mob: {c.mobile}</span>}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(c)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(c.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
