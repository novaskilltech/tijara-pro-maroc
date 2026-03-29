import { formatCurrency } from "@/lib/format-currency";
import { useState, useEffect } from "react";
import { useCreditNotes } from "@/hooks/useCreditNotes";
import { useAuth } from "@/hooks/useAuth";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useCompany } from "@/hooks/useCompany";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { InvoiceLineEditor } from "./InvoiceLineEditor";
import { InvoiceAttachmentsPanel } from "./InvoiceAttachmentsPanel";
import { DocumentAttachmentsPanel } from "@/components/DocumentAttachmentsPanel";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { CREDIT_NOTE_STATUS_LABELS, calcLineTotals, type CreditNote, type CreditNoteLine, type Invoice } from "@/types/invoice";
import { supabase } from "@/integrations/supabase/client";
import { printCreditNotePdf } from "@/lib/pdf";
import { PrintButton } from "@/components/PrintButton";
import { Plus, Search, Loader2, CheckCircle, XCircle } from "lucide-react";

interface CreditNoteListProps {
  linkedInvoice?: Invoice | null;
  onClearLinked?: () => void;
}

export function CreditNoteList({ linkedInvoice, onClearLinked }: CreditNoteListProps) {
  const { creditNotes, loading, create, validate, cancel } = useCreditNotes();
  const { isAdmin, hasRole } = useAuth();
  const { settings: companySettings } = useCompanySettings();
  const { activeCompany } = useCompany();
  const canManage = isAdmin() || hasRole("accountant");

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);

  // Form state
  const [cnType, setCnType] = useState<"client" | "supplier">("client");
  const [partnerId, setPartnerId] = useState("");
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState<Partial<CreditNoteLine>[]>([]);
  const [saving, setSaving] = useState(false);

  const companyId = activeCompany?.id ?? null;

  useEffect(() => {
    if (!companyId) return;
    (supabase as any).from("products").select("id, code, name, sale_price, purchase_price, tva_rate").eq("is_active", true).eq("company_id", companyId).then(({ data }: any) => setProducts(data || []));
  }, [companyId]);

  // When linked invoice is provided, auto-open form
  useEffect(() => {
    if (linkedInvoice) {
      setCnType(linkedInvoice.invoice_type);
      setPartnerId(linkedInvoice.customer_id || linkedInvoice.supplier_id || "");
      setReason(`Avoir sur facture ${linkedInvoice.invoice_number}`);
      setLines([]);
      setFormOpen(true);
    }
  }, [linkedInvoice]);

  useEffect(() => {
    const table = cnType === "client" ? "customers" : "suppliers";
    (supabase as any).from(table).select("id, code, name").eq("is_active", true).order("name").then(({ data }: any) => setPartners(data || []));
  }, [cnType]);

  const filtered = creditNotes.filter((cn) => {
    return !search || cn.credit_note_number.toLowerCase().includes(search.toLowerCase()) ||
      (cn.customer?.name || cn.supplier?.name || "").toLowerCase().includes(search.toLowerCase());
  });

  const subtotalHt = lines.reduce((s, l) => s + (l.total_ht || 0), 0);
  const totalTva = lines.reduce((s, l) => s + (l.total_tva || 0), 0);
  const totalTtc = lines.reduce((s, l) => s + (l.total_ttc || 0), 0);

  const handleCreate = async () => {
    if (!partnerId || lines.length === 0) return;
    setSaving(true);
    const cn: Partial<CreditNote> = {
      credit_note_type: cnType,
      reason,
      invoice_id: linkedInvoice?.id || null,
      subtotal_ht: Math.round(subtotalHt * 100) / 100,
      total_tva: Math.round(totalTva * 100) / 100,
      total_ttc: Math.round(totalTtc * 100) / 100,
      created_by: (await supabase.auth.getUser()).data.user?.id || undefined,
      company_id: activeCompany?.id || undefined,
    };
    if (cnType === "client") cn.customer_id = partnerId;
    else cn.supplier_id = partnerId;

    await create(cn, lines);
    setSaving(false);
    setFormOpen(false);
    onClearLinked?.();
  };

  const partnerOptions = partners.map((p: any) => ({ value: p.id, label: `${p.code} - ${p.name}` }));

  const handlePrint = async (cn: any, download = false) => {
    const { data: lines } = await supabase.from("credit_note_lines").select("*").eq("credit_note_id", cn.id).order("sort_order");
    await printCreditNotePdf(cn, lines || [], activeCompany?.id, download);
  };

  const statusVariant = (s: string) => s === "draft" ? "secondary" as const : s === "validated" ? "default" as const : "destructive" as const;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        {canManage && (
          <Button onClick={() => { setFormOpen(true); setCnType("client"); setPartnerId(""); setReason(""); setLines([]); }} className="gap-1">
            <Plus className="h-4 w-4" /> Nouvel avoir
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">Aucun avoir trouvé</div>
      ) : (
        <div className="bg-card rounded-lg border shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Avoir</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Tiers</TableHead>
                <TableHead>Facture liée</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Total TTC</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((cn) => (
                <TableRow key={cn.id}>
                  <TableCell className="font-medium">{cn.credit_note_number}</TableCell>
                  <TableCell><Badge variant="outline">{cn.credit_note_type === "client" ? "Client" : "Fournisseur"}</Badge></TableCell>
                  <TableCell>{cn.customer?.name || cn.supplier?.name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{cn.invoice?.invoice_number || "—"}</TableCell>
                  <TableCell><Badge variant={statusVariant(cn.status)}>{CREDIT_NOTE_STATUS_LABELS[cn.status]}</Badge></TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(cn.total_ttc)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <PrintButton
                        iconOnly
                        onPrint={() => handlePrint(cn, false)}
                        onDownload={() => handlePrint(cn, true)}
                      />
                      {cn.status === "draft" && canManage && (
                        <Button variant="ghost" size="sm" onClick={() => validate(cn.id, cn.invoice_id, cn.total_ttc)} className="gap-1">
                          <CheckCircle className="h-4 w-4" /> Valider
                        </Button>
                      )}
                      {cn.status === "draft" && isAdmin() && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => cancel(cn.id)}>
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create credit note dialog */}
      <Dialog open={formOpen} onOpenChange={(o) => { if (!o) { setFormOpen(false); onClearLinked?.(); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvel avoir</DialogTitle>
          </DialogHeader>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={cnType} onValueChange={(v) => setCnType(v as any)} disabled={!!linkedInvoice}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="supplier">Fournisseur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{cnType === "client" ? "Client" : "Fournisseur"}</Label>
              <SearchableSelect
                options={partnerOptions}
                value={partnerId}
                onValueChange={setPartnerId}
                disabled={!!linkedInvoice}
                placeholder={cnType === "client" ? "Rechercher un client..." : "Rechercher un fournisseur..."}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Motif</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Motif de l'avoir..." />
          </div>
          <div className="mt-2">
            <Label className="mb-2 block">Lignes</Label>
            <InvoiceLineEditor lines={lines} onChange={setLines} products={products} invoiceType={cnType} />
          </div>
          <div className="flex justify-end mt-4">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Total HT</span><span>{subtotalHt.toFixed(2)} MAD</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">TVA</span><span>{totalTva.toFixed(2)} MAD</span></div>
              <div className="flex justify-between border-t pt-1 text-base"><span className="font-semibold">Total TTC</span><span className="font-bold text-primary">{totalTtc.toFixed(2)} MAD</span></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setFormOpen(false); onClearLinked?.(); }}>Annuler</Button>
            <Button onClick={handleCreate} disabled={saving || !partnerId || lines.length === 0}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Créer l'avoir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
