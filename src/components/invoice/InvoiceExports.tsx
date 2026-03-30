import { useState, useEffect } from "react";
import { useInvoices } from "@/hooks/useInvoices";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { excelExport } from "@/lib/excel-export";
import { printJournalPdf } from "@/lib/pdf";
import { useCompany } from "@/hooks/useCompany";
import { Download, FileSpreadsheet, Loader2, CalendarIcon, FileText } from "lucide-react";
import { format, isWithinInterval, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export function InvoiceExports() {
  const clientInvoices = useInvoices("client");
  const supplierInvoices = useInvoices("supplier");
  const [exportType, setExportType] = useState("client");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const { activeCompany } = useCompany();

  const allInvoices = exportType === "client" ? clientInvoices.invoices : supplierInvoices.invoices;
  
  const filteredInvoices = allInvoices.filter(inv => {
    if (!dateRange.from || !dateRange.to) return true;
    const invDate = parseISO(inv.invoice_date);
    return isWithinInterval(invDate, { start: dateRange.from, end: dateRange.to });
  });

  const handleExport = () => {
    const filename = `${exportType === "client" ? "factures_clients" : "factures_fournisseurs"}_${format(new Date(), "yyyyMMdd")}`;
    const formattedData = excelExport.formatInvoicesForExport(filteredInvoices);
    excelExport.exportToExcel(formattedData, filename, "Factures");
  };

  const handlePdfJournal = async () => {
    if (!dateRange.from || !dateRange.to) return;
    const type = exportType === "client" ? "journal_ventes" : "journal_achats";
    const period = {
      from: format(dateRange.from, "yyyy-MM-dd"),
      to: format(dateRange.to, "yyyy-MM-dd"),
    };
    await printJournalPdf(filteredInvoices, type, period, activeCompany?.id);
  };

  const loading = clientInvoices.loading || supplierInvoices.loading;

  const stats = {
    total: filteredInvoices.length,
    totalTtc: filteredInvoices.reduce((s, i) => s + i.total_ttc, 0),
    unpaid: filteredInvoices.filter((i) => i.status === "validated").reduce((s, i) => s + i.remaining_balance, 0),
  };

  return (
    <div className="space-y-6">
      {/* Stats cards for current filtered view */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Nombre de factures</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total TTC (Période)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{stats.totalTtc.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Reste à recouvrer / payer</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{stats.unpaid.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD</p>
          </CardContent>
        </Card>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="h-4 w-4 text-primary" /> Options d'exportation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-end gap-6">
            <div className="space-y-2">
              <Label>Flux</Label>
              <Select value={exportType} onValueChange={setExportType}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Ventes (Clients)</SelectItem>
                  <SelectItem value="supplier">Achats (Fournisseurs)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Période</Label>
              <div className="grid gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant={"outline"}
                      className={cn(
                        "w-[260px] justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y", { locale: fr })} -{" "}
                            {format(dateRange.to, "LLL dd, y", { locale: fr })}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y", { locale: fr })
                        )
                      ) : (
                        <span>Choisir une période</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={(range: any) => setDateRange(range)}
                      numberOfMonths={2}
                      locale={fr}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleExport} disabled={loading || filteredInvoices.length === 0} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Exporter Excel
              </Button>
              <Button 
                variant="outline" 
                className="gap-2" 
                onClick={handlePdfJournal}
                disabled={loading || filteredInvoices.length === 0}
              >
                <FileText className="h-4 w-4" />
                Journal PDF
              </Button>
            </div>
          </div>
          
          {filteredInvoices.length === 0 && !loading && (
            <div className="p-4 border border-dashed rounded-md text-center text-sm text-muted-foreground">
              Aucune facture trouvée pour cette période.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
