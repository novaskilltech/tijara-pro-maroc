import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { useExpenseCategories, Expense } from "@/hooks/useExpenses";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  expense?: Expense | null;
  onSave: (values: Partial<Expense>) => Promise<any>;
}

const TVA_RATES = [0, 7, 10, 14, 20];
const PAYMENT_METHODS = [
  { value: "transfer", label: "Virement bancaire" },
  { value: "cheque",   label: "Chèque" },
  { value: "cash",     label: "Espèces" },
  { value: "card",     label: "Carte bancaire" },
  { value: "lcn",      label: "LCN" },
];
const PAYMENT_STATUSES = [
  { value: "pending",   label: "En attente" },
  { value: "paid",      label: "Payé" },
  { value: "cancelled", label: "Annulé" },
];

const empty: Partial<Expense> = {
  expense_date: new Date().toISOString().slice(0, 10),
  description: "",
  amount_ht: 0,
  tva_rate: 20,
  amount_tva: 0,
  amount_ttc: 0,
  payment_status: "pending",
  payment_method: null,
  payment_date: null,
  supplier_id: null,
  category_id: null,
  bank_account_id: null,
  notes: "",
};

export function ExpenseFormDialog({ open, onOpenChange, expense, onSave }: Props) {
  const [form, setForm] = useState<Partial<Expense>>(empty);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [bankAccounts, setBankAccounts] = useState<{ id: string; account_name: string; bank_name: string }[]>([]);
  const { categories } = useExpenseCategories();
  const { activeCompany } = useCompany();

  useEffect(() => {
    if (expense) {
      setForm({ ...expense });
    } else {
      setForm({ ...empty });
    }
  }, [expense, open]);

  useEffect(() => {
    if (!open) return;
    const companyId = activeCompany?.id;
    if (!companyId) return;
    Promise.all([
      (supabase as any).from("suppliers").select("id, name").eq("is_active", true).eq("company_id", companyId).order("name"),
      (supabase as any).from("bank_accounts").select("id, account_name, bank_name").eq("company_id", companyId).eq("is_active", true),
    ]).then(([s, b]) => {
      setSuppliers(s.data || []);
      setBankAccounts(b.data || []);
    });
  }, [open, activeCompany]);

  const set = (key: keyof Expense, value: any) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      // Recalculate totals when amounts change
      if (key === "amount_ht" || key === "tva_rate") {
        const ht = Number(key === "amount_ht" ? value : prev.amount_ht) || 0;
        const rate = Number(key === "tva_rate" ? value : prev.tva_rate) || 0;
        const tva = ht * rate / 100;
        next.amount_tva = Math.round(tva * 100) / 100;
        next.amount_ttc = Math.round((ht + tva) * 100) / 100;
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!form.description || !form.amount_ht) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{expense ? "Modifier la dépense" : "Nouvelle dépense"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Row 1: date + description */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input type="date" value={form.expense_date || ""} onChange={e => set("expense_date", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={form.category_id || "none"} onValueChange={v => set("category_id", v === "none" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Aucune —</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: c.color }} />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Input value={form.description || ""} onChange={e => set("description", e.target.value)} placeholder="Libellé de la dépense…" />
          </div>

          {/* Supplier */}
          <div className="space-y-2">
            <Label>Fournisseur</Label>
            <Select value={form.supplier_id || "none"} onValueChange={v => set("supplier_id", v === "none" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un fournisseur…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Aucun —</SelectItem>
                {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Montant HT (MAD) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.amount_ht || ""}
                onChange={e => set("amount_ht", parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Taux TVA</Label>
              <Select value={String(form.tva_rate ?? 20)} onValueChange={v => set("tva_rate", Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TVA_RATES.map(r => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Total TTC (MAD)</Label>
              <Input
                readOnly
                value={Number(form.amount_ttc || 0).toLocaleString("fr-MA", { minimumFractionDigits: 2 })}
                className="bg-muted font-medium"
              />
            </div>
          </div>

          {/* Payment */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Statut de paiement</Label>
              <Select value={form.payment_status || "pending"} onValueChange={v => set("payment_status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mode de paiement</Label>
              <Select value={form.payment_method || "none"} onValueChange={v => set("payment_method", v === "none" ? null : v)}>
                <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Aucun —</SelectItem>
                  {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.payment_status === "paid" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date de paiement</Label>
                <Input type="date" value={form.payment_date || ""} onChange={e => set("payment_date", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Compte bancaire débité</Label>
                <Select value={form.bank_account_id || "none"} onValueChange={v => set("bank_account_id", v === "none" ? null : v)}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Aucun —</SelectItem>
                    {bankAccounts.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.bank_name} — {b.account_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea rows={2} value={form.notes || ""} onChange={e => set("notes", e.target.value)} placeholder="Remarques éventuelles…" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving || !form.description || !form.amount_ht}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
