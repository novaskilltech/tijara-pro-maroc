import { useUnpaidDashboard } from "@/hooks/useUnpaidDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, TrendingDown } from "lucide-react";

export function UnpaidDashboard() {
  const { invoices, buckets, totalUnpaid, loading } = useUnpaidDashboard();

  if (loading) return <p className="text-muted-foreground py-8 text-center">Chargement...</p>;

  // Top debtors
  const debtorMap = new Map<string, { name: string; total: number }>();
  invoices.forEach((inv) => {
    const existing = debtorMap.get(inv.customer_id) || { name: inv.customer_name, total: 0 };
    existing.total += inv.remaining_balance;
    debtorMap.set(inv.customer_id, existing);
  });
  const topDebtors = Array.from(debtorMap.values()).sort((a, b) => b.total - a.total).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total impayé</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{totalUnpaid.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MAD</p>
          </CardContent>
        </Card>
        {buckets.map((b) => (
          <Card key={b.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{b.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold">{b.total.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MAD</p>
              <p className="text-xs text-muted-foreground">{b.count} facture{b.count > 1 ? "s" : ""}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top debtors */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><TrendingDown className="h-4 w-4" /> Top débiteurs</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topDebtors.map((d, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm">{d.name}</span>
                  <span className="font-medium text-sm">{d.total.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MAD</span>
                </div>
              ))}
              {topDebtors.length === 0 && <p className="text-muted-foreground text-sm">Aucun impayé</p>}
            </div>
          </CardContent>
        </Card>

        {/* Overdue invoices */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4" /> Factures échues</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {invoices.filter((i) => i.days_overdue > 0).slice(0, 10).map((inv) => (
                <div key={inv.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{inv.invoice_number}</span>
                    <span className="text-muted-foreground ml-2">{inv.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-[10px]">
                      <Clock className="h-3 w-3 mr-1" /> {inv.days_overdue}j
                    </Badge>
                    <span className="font-medium">{inv.remaining_balance.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              ))}
              {invoices.filter((i) => i.days_overdue > 0).length === 0 && <p className="text-muted-foreground text-sm">Aucune facture échue</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full list */}
      <Card>
        <CardHeader><CardTitle className="text-base">Balance âgée détaillée</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facture</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead>Retard</TableHead>
                <TableHead>Tranche</TableHead>
                <TableHead className="text-right">Solde dû</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                  <TableCell>{inv.customer_name}</TableCell>
                  <TableCell>{inv.due_date ? new Date(inv.due_date).toLocaleDateString("fr-FR") : "—"}</TableCell>
                  <TableCell>{inv.days_overdue > 0 ? `${inv.days_overdue} jours` : "—"}</TableCell>
                  <TableCell><Badge variant="outline">{inv.bucket}</Badge></TableCell>
                  <TableCell className="text-right font-medium">{inv.remaining_balance.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MAD</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
