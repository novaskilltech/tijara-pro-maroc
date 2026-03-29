import { useState, useEffect } from "react";
import { useBankTransactions, type BankTransaction } from "@/hooks/useBankTransactions";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { Button } from "@/components/ui/button";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Upload, Link2, CheckCircle2 } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";

export function BankReconciliation() {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? null;
  const [bankAccountId, setBankAccountId] = useState<string | null>(null);
  const [bankAccounts, setBankAccounts] = useState<{ id: string; account_name: string; bank_name: string }[]>([]);
  const { transactions, loading, fetchTransactions, importTransactions, reconcile } = useBankTransactions(bankAccountId);
  const [payments, setPayments] = useState<{ id: string; payment_number: string; amount: number; payment_date: string; reference: string | null }[]>([]);
  const [matchingPaymentId, setMatchingPaymentId] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!companyId) return;
    (supabase as any).from("bank_accounts").select("id, account_name, bank_name").eq("is_active", true).eq("company_id", companyId).then(({ data }: any) => setBankAccounts(data || []));
  }, [companyId]);

  useEffect(() => {
    if (bankAccountId) {
      fetchTransactions();
      (supabase as any).from("payments").select("id, payment_number, amount, payment_date, reference")
        .order("payment_date", { ascending: false }).limit(200)
        .then(({ data }: any) => setPayments(data || []));
    }
  }, [bankAccountId, fetchTransactions]);

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) { toast({ title: "Fichier vide", variant: "destructive" }); return; }

    const rows = lines.slice(1).map((line) => {
      const cols = line.split(/[;,\t]/);
      return {
        date: cols[0]?.trim() || new Date().toISOString().split("T")[0],
        description: cols[1]?.trim() || "",
        reference: cols[2]?.trim() || "",
        debit: parseFloat(cols[3]?.trim() || "0") || 0,
        credit: parseFloat(cols[4]?.trim() || "0") || 0,
      };
    }).filter((r) => r.description);

    await importTransactions(rows);
    e.target.value = "";
  };

  // Auto-suggest matches
  const suggestMatch = (tx: BankTransaction): string | null => {
    const txAmount = tx.credit > 0 ? tx.credit : tx.debit;
    const match = payments.find((p) =>
      Math.abs(Number(p.amount) - txAmount) < 0.01 &&
      (!tx.reference || (p.reference && p.reference.toLowerCase().includes(tx.reference.toLowerCase())))
    );
    return match?.id || null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-72">
          <Label>Compte bancaire</Label>
          <SearchableSelect
            options={bankAccounts.map(b => ({ value: b.id, label: b.account_name, sub: b.bank_name }))}
            value={bankAccountId || ""}
            onValueChange={setBankAccountId}
            placeholder="Sélectionner un compte..."
          />
        </div>
        {bankAccountId && (
          <div className="pt-5">
            <Label htmlFor="import-file" className="cursor-pointer">
              <Button variant="outline" className="gap-1.5" asChild>
                <span><Upload className="h-4 w-4" /> Importer relevé (CSV)</span>
              </Button>
            </Label>
            <Input id="import-file" type="file" accept=".csv,.txt" className="hidden" onChange={handleFileImport} />
          </div>
        )}
      </div>

      {bankAccountId && (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead className="text-right">Débit</TableHead>
                <TableHead className="text-right">Crédit</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Rapprochement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : transactions.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucune transaction. Importez un relevé bancaire.</TableCell></TableRow>
              ) : transactions.map((tx) => {
                const suggested = !tx.is_reconciled ? suggestMatch(tx) : null;
                return (
                  <TableRow key={tx.id}>
                    <TableCell>{new Date(tx.transaction_date).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{tx.description}</TableCell>
                    <TableCell className="text-muted-foreground">{tx.reference || "—"}</TableCell>
                    <TableCell className="text-right">{tx.debit > 0 ? Number(tx.debit).toLocaleString("fr-FR", { minimumFractionDigits: 2 }) : ""}</TableCell>
                    <TableCell className="text-right">{tx.credit > 0 ? Number(tx.credit).toLocaleString("fr-FR", { minimumFractionDigits: 2 }) : ""}</TableCell>
                    <TableCell>
                      {tx.is_reconciled
                        ? <Badge className="bg-primary/10 text-primary border-primary/20"><CheckCircle2 className="h-3 w-3 mr-1" /> Rapproché</Badge>
                        : <Badge variant="outline">Non rapproché</Badge>
                      }
                    </TableCell>
                    <TableCell>
                      {!tx.is_reconciled && (
                        <div className="flex items-center gap-1">
                           <SearchableSelect
                            options={payments.map(p => ({ value: p.id, label: `${p.payment_number} (${Number(p.amount).toFixed(2)})` }))}
                            value={matchingPaymentId[tx.id] || suggested || ""}
                            onValueChange={(v) => setMatchingPaymentId({ ...matchingPaymentId, [tx.id]: v })}
                            placeholder="Paiement..."
                            className="w-52"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1"
                            disabled={!matchingPaymentId[tx.id] && !suggested}
                            onClick={() => reconcile(tx.id, matchingPaymentId[tx.id] || suggested!)}
                          >
                            <Link2 className="h-3 w-3" /> Lier
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
