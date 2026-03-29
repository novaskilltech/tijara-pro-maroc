import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Payment } from "@/hooks/usePayments";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";

export interface PaymentPrefill {
  customerId?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  remainingBalance?: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  paymentType: "client" | "supplier";
  onSubmit: (payment: Partial<Payment>, allocations: { invoice_id: string; amount: number }[]) => Promise<any>;
  checkCashLimit: (customerId: string, amount: number, date: string) => Promise<{ allowed: boolean; totalToday: number }>;
  prefill?: PaymentPrefill | null;
}

export function PaymentFormDialog({ open, onOpenChange, paymentType, onSubmit, checkCashLimit, prefill }: Props) {
  const { isAdmin } = useAuth();
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? null;
  const [method, setMethod] = useState("transfer");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [entityId, setEntityId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeBank, setChequeBank] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [cashBlocked, setCashBlocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [entities, setEntities] = useState<{ id: string; name: string }[]>([]);
  const [bankAccounts, setBankAccounts] = useState<{ id: string; account_name: string; bank_name: string }[]>([]);
  const [openInvoices, setOpenInvoices] = useState<{ id: string; invoice_number: string; remaining_balance: number }[]>([]);
  const [allocations, setAllocations] = useState<{ invoice_id: string; amount: number }[]>([]);

  useEffect(() => {
    if (!open || !companyId) return;
    const table = paymentType === "client" ? "customers" : "suppliers";
    (supabase as any).from(table).select("id, name").eq("is_active", true).eq("company_id", companyId).order("name").then(({ data }: any) => setEntities(data || []));
    (supabase as any).from("bank_accounts").select("id, account_name, bank_name").eq("is_active", true).eq("company_id", companyId).then(({ data }: any) => setBankAccounts(data || []));
  }, [open, paymentType, companyId]);

  // Apply prefill when dialog opens with prefill data
  useEffect(() => {
    if (!open || !prefill) return;
    if (prefill.customerId) setEntityId(prefill.customerId);
    if (prefill.remainingBalance) setAmount(String(prefill.remainingBalance));
    if (prefill.invoiceNumber) setReference(prefill.invoiceNumber);
  }, [open, prefill]);

  useEffect(() => {
    if (!entityId || !companyId) { setOpenInvoices([]); return; }
    const col = paymentType === "client" ? "customer_id" : "supplier_id";
    (supabase as any).from("invoices")
      .select("id, invoice_number, remaining_balance")
      .eq("invoice_type", paymentType)
      .eq(col, entityId)
      .eq("company_id", companyId)
      .gt("remaining_balance", 0)
      .in("status", ["validated"])
      .order("invoice_date")
      .then(({ data }: any) => {
        setOpenInvoices(data || []);
        // Auto-add allocation for prefilled invoice
        if (prefill?.invoiceId && data?.length) {
          const inv = data.find((i: any) => i.id === prefill.invoiceId);
          if (inv && allocations.length === 0) {
            setAllocations([{ invoice_id: inv.id, amount: Number(inv.remaining_balance) }]);
          }
        }
      });
  }, [entityId, paymentType, companyId]);

  const addAllocation = () => setAllocations([...allocations, { invoice_id: "", amount: 0 }]);
  const removeAllocation = (idx: number) => setAllocations(allocations.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount);
    if (!entityId || !numAmount) {
      toast({ title: "Champs requis", description: "Sélectionnez un tiers et un montant", variant: "destructive" });
      return;
    }

    // Cash limit check
    if (method === "cash" && paymentType === "client") {
      const { allowed, totalToday } = await checkCashLimit(entityId, numAmount, date);
      if (!allowed) {
        if (!isAdmin()) {
          toast({ title: "Limite espèces dépassée", description: `Total aujourd'hui: ${totalToday.toFixed(2)} MAD. Limite: 4 999,99 MAD. Seul un admin peut déroger.`, variant: "destructive" });
          return;
        }
        setCashBlocked(true);
        if (!overrideReason) {
          toast({ title: "Motif requis", description: "Veuillez saisir le motif de dérogation", variant: "destructive" });
          return;
        }
      }
    }

    setSubmitting(true);
    const payment: Partial<Payment> = {
      payment_method: method as any,
      payment_date: date,
      amount: numAmount,
      reference,
      notes,
      customer_id: paymentType === "client" ? entityId : null,
      supplier_id: paymentType === "supplier" ? entityId : null,
      bank_account_id: bankAccountId || null,
      cheque_number: chequeNumber || null,
      cheque_bank: chequeBank || null,
      is_override: cashBlocked,
      override_reason: cashBlocked ? overrideReason : null,
    };

    const validAllocations = allocations.filter((a) => a.invoice_id && a.amount > 0);
    await onSubmit(payment, validAllocations);
    setSubmitting(false);
    onOpenChange(false);
    // Reset
    setMethod("transfer"); setAmount(""); setReference(""); setNotes(""); setEntityId(""); setAllocations([]); setCashBlocked(false); setOverrideReason("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau {paymentType === "client" ? "Encaissement" : "Décaissement"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{paymentType === "client" ? "Client" : "Fournisseur"}</Label>
            <Select value={entityId} onValueChange={setEntityId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                {entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Mode de paiement</Label>
            <Select value={method} onValueChange={(v) => { setMethod(v); setCashBlocked(false); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Espèces</SelectItem>
                <SelectItem value="cheque">Chèque</SelectItem>
                <SelectItem value="transfer">Virement</SelectItem>
                <SelectItem value="lcn">LCN</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Montant (MAD)</Label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label>Compte bancaire</Label>
            <Select value={bankAccountId} onValueChange={setBankAccountId}>
              <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
              <SelectContent>
                {bankAccounts.map((b) => <SelectItem key={b.id} value={b.id}>{b.account_name} - {b.bank_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Référence</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Réf. virement, etc." />
          </div>
          {method === "cheque" && (
            <>
              <div>
                <Label>N° Chèque</Label>
                <Input value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} />
              </div>
              <div>
                <Label>Banque émettrice</Label>
                <Input value={chequeBank} onChange={(e) => setChequeBank(e.target.value)} />
              </div>
            </>
          )}
          <div className="col-span-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        {cashBlocked && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Limite espèces dépassée (4 999,99 MAD/jour)</p>
              <Label className="mt-2">Motif de dérogation (obligatoire)</Label>
              <Input value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="Saisir le motif..." />
            </div>
          </div>
        )}

        {/* Allocations */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Imputation sur factures</Label>
            <Button variant="outline" size="sm" onClick={addAllocation} className="gap-1"><Plus className="h-3 w-3" /> Ajouter</Button>
          </div>
          {allocations.map((alloc, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Select value={alloc.invoice_id} onValueChange={(v) => {
                const updated = [...allocations];
                updated[idx].invoice_id = v;
                setAllocations(updated);
              }}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Facture" /></SelectTrigger>
                <SelectContent>
                  {openInvoices.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.invoice_number} — Solde: {Number(inv.remaining_balance).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                step="0.01"
                className="w-32"
                placeholder="Montant"
                value={alloc.amount || ""}
                onChange={(e) => {
                  const updated = [...allocations];
                  updated[idx].amount = parseFloat(e.target.value) || 0;
                  setAllocations(updated);
                }}
              />
              <Button variant="ghost" size="icon" onClick={() => removeAllocation(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
