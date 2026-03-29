import { useState, useEffect } from "react";
import { usePayments, type Payment } from "@/hooks/usePayments";
import { PaymentFormDialog, type PaymentPrefill } from "./PaymentFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Search, Trash2 } from "lucide-react";

const METHOD_LABELS: Record<string, string> = {
  cash: "Espèces",
  cheque: "Chèque",
  transfer: "Virement",
  lcn: "LCN",
};

export function PaymentList({ paymentType, prefill }: { paymentType: "client" | "supplier"; prefill?: PaymentPrefill | null }) {
  const { payments, loading, create, remove, checkCashLimit } = usePayments(paymentType);
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [activePrefill, setActivePrefill] = useState<PaymentPrefill | null>(null);

  useEffect(() => {
    if (prefill) {
      setActivePrefill(prefill);
      setFormOpen(true);
    }
  }, [prefill]);

  const filtered = payments.filter((p) => {
    const q = search.toLowerCase();
    return p.payment_number.toLowerCase().includes(q) ||
      (p.customer?.name || "").toLowerCase().includes(q) ||
      (p.supplier?.name || "").toLowerCase().includes(q) ||
      (p.reference || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Nouveau {paymentType === "client" ? "encaissement" : "décaissement"}
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N°</TableHead>
              <TableHead>{paymentType === "client" ? "Client" : "Fournisseur"}</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead>Référence</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucun règlement</TableCell></TableRow>
            ) : filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.payment_number}</TableCell>
                <TableCell>{paymentType === "client" ? p.customer?.name : p.supplier?.name}</TableCell>
                <TableCell>{new Date(p.payment_date).toLocaleDateString("fr-FR")}</TableCell>
                <TableCell>
                  <Badge variant="outline">{METHOD_LABELS[p.payment_method] || p.payment_method}</Badge>
                  {p.is_override && <Badge variant="destructive" className="ml-1 text-[10px]">Dérogation</Badge>}
                </TableCell>
                <TableCell className="text-right font-medium">{Number(p.amount).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MAD</TableCell>
                <TableCell className="text-muted-foreground">{p.reference || "—"}</TableCell>
                <TableCell>
                  {isAdmin() && (
                    <Button variant="ghost" size="icon" onClick={() => remove(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <PaymentFormDialog
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setActivePrefill(null); }}
        paymentType={paymentType}
        onSubmit={create}
        checkCashLimit={checkCashLimit}
        prefill={activePrefill}
      />
    </div>
  );
}
