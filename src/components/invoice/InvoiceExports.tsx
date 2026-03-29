import { useState, useEffect } from "react";
import { useInvoices } from "@/hooks/useInvoices";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exportToCsv } from "@/lib/invoice-export";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";

export function InvoiceExports() {
  const clientInvoices = useInvoices("client");
  const supplierInvoices = useInvoices("supplier");
  const [exportType, setExportType] = useState("client");

  const handleExport = () => {
    const invoices = exportType === "client" ? clientInvoices.invoices : supplierInvoices.invoices;
    const filename = exportType === "client" ? "factures_clients" : "factures_fournisseurs";
    exportToCsv(invoices, filename);
  };

  const loading = clientInvoices.loading || supplierInvoices.loading;

  const clientStats = {
    total: clientInvoices.invoices.length,
    totalTtc: clientInvoices.invoices.reduce((s, i) => s + i.total_ttc, 0),
    unpaid: clientInvoices.invoices.filter((i) => i.status === "validated").reduce((s, i) => s + i.remaining_balance, 0),
  };

  const supplierStats = {
    total: supplierInvoices.invoices.length,
    totalTtc: supplierInvoices.invoices.reduce((s, i) => s + i.total_ttc, 0),
    unpaid: supplierInvoices.invoices.filter((i) => i.status === "validated").reduce((s, i) => s + i.remaining_balance, 0),
  };

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Factures clients</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{clientStats.total}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">CA TTC clients</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-primary">{clientStats.totalTtc.toFixed(2)} MAD</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Factures fournisseurs</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{supplierStats.total}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Impayés clients</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-destructive">{clientStats.unpaid.toFixed(2)} MAD</p></CardContent>
        </Card>
      </div>

      {/* Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="h-4 w-4 text-primary" /> Exporter les factures
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={exportType} onValueChange={setExportType}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Factures clients</SelectItem>
                  <SelectItem value="supplier">Factures fournisseurs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleExport} disabled={loading} className="gap-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Exporter CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
