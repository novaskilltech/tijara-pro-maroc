import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Paperclip, Eye, FileText, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DocAttachmentsDialog } from "@/components/DocAttachmentsDialog";
import { useCompany } from "@/hooks/useCompany";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { printDeliveryPdf } from "@/lib/pdf";
import { PrintButton } from "@/components/PrintButton";
import { DELIVERY_STATUS_LABELS, DELIVERY_STATUS_COLORS } from "@/hooks/useSales";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface Props {
  deliveries: any;
  stock: any;
  onView?: (id: string) => void;
  onNew?: () => void;
}

async function createInvoiceFromDeliveries(deliveryIds: string[], companyId: string | null) {
  if (!companyId || deliveryIds.length === 0) return null;

  // Fetch all deliveries with lines
  const { data: dels, error: dErr } = await (supabase as any)
    .from("deliveries")
    .select("*, delivery_lines:delivery_lines(*, product:products(code,name,unit,tva_rate))")
    .in("id", deliveryIds);

  if (dErr || !dels || dels.length === 0) {
    toast({ title: "Erreur", description: dErr?.message || "Livraisons introuvables", variant: "destructive" });
    return null;
  }

  // Validate: all same customer
  const customerIds = [...new Set(dels.map((d: any) => d.customer_id))];
  if (customerIds.length > 1) {
    toast({ title: "Erreur", description: "Impossible de regrouper des bons de livraison de clients différents.", variant: "destructive" });
    return null;
  }

  // Validate: all validated
  const notValidated = dels.filter((d: any) => d.status !== "validated");
  if (notValidated.length > 0) {
    toast({ title: "Erreur", description: "Seuls les bons de livraison validés peuvent être facturés.", variant: "destructive" });
    return null;
  }

  // Validate: none already invoiced
  const alreadyInvoiced = dels.filter((d: any) => d.invoice_id);
  if (alreadyInvoiced.length > 0) {
    toast({ title: "Erreur", description: "Un ou plusieurs bons de livraison sélectionnés sont déjà facturés.", variant: "destructive" });
    return null;
  }

  // Collect all lines
  const allLines: any[] = [];
  for (const d of dels) {
    for (const l of (d.delivery_lines || [])) {
      allLines.push(l);
    }
  }

  if (allLines.length === 0) {
    toast({ title: "Erreur", description: "Aucune ligne de livraison trouvée.", variant: "destructive" });
    return null;
  }

  // Calculate totals
  const subtotal_ht = allLines.reduce((s: number, l: any) => s + Number(l.total_ht || 0), 0);
  const total_tva = allLines.reduce((s: number, l: any) => s + Number(l.total_tva || 0), 0);
  const total_ttc = allLines.reduce((s: number, l: any) => s + Number(l.total_ttc || 0), 0);

  // Generate invoice number
  const { data: num, error: numErr } = await supabase.rpc("next_document_number", { p_type: "FAC", p_company_id: companyId } as any);
  if (numErr) {
    toast({ title: "Erreur numérotation", description: numErr.message, variant: "destructive" });
    return null;
  }

  const { data: { user } } = await supabase.auth.getUser();

  // Create invoice
  const { data: inv, error: invErr } = await (supabase as any).from("invoices").insert({
    invoice_number: num,
    invoice_type: "client",
    customer_id: customerIds[0],
    sales_order_id: dels[0]?.sales_order_id || null,
    subtotal_ht: Math.round(subtotal_ht * 100) / 100,
    total_tva: Math.round(total_tva * 100) / 100,
    total_ttc: Math.round(total_ttc * 100) / 100,
    remaining_balance: Math.round(total_ttc * 100) / 100,
    status: "draft",
    created_by: user?.id,
    company_id: companyId,
    notes: deliveryIds.length > 1
      ? `Facture groupée depuis BL: ${dels.map((d: any) => d.delivery_number).join(", ")}`
      : `Facture depuis BL: ${dels[0]?.delivery_number}`,
  }).select().single();

  if (invErr) {
    toast({ title: "Erreur", description: invErr.message, variant: "destructive" });
    return null;
  }

  // Insert invoice lines
  let sortIdx = 0;
  for (const l of allLines) {
    await (supabase as any).from("invoice_lines").insert({
      invoice_id: inv.id,
      product_id: l.product_id || null,
      description: l.description,
      quantity: l.quantity,
      unit_price: l.unit_price,
      discount_percent: l.discount_percent || 0,
      tva_rate: l.tva_rate,
      total_ht: l.total_ht,
      total_tva: l.total_tva,
      total_ttc: l.total_ttc,
      sort_order: sortIdx++,
      company_id: companyId,
    });
  }

  // Link deliveries to invoice
  for (const d of dels) {
    await (supabase as any).from("deliveries").update({ invoice_id: inv.id }).eq("id", d.id);
  }

  // Audit log
  await (supabase as any).from("audit_logs").insert({
    action: deliveryIds.length > 1 ? "invoice_multiple_deliveries" : "invoice_single_delivery",
    table_name: "invoices",
    record_id: inv.id,
    details: `FAC: ${num} depuis BL: ${dels.map((d: any) => d.delivery_number).join(", ")}`,
    user_id: user?.id,
  });

  toast({ title: "Facture créée avec succès", description: num as string });
  return inv;
}

export function DeliveryListPage({ deliveries, stock, onView, onNew }: Props) {
  const [attachDialog, setAttachDialog] = useState<{ id: string; number: string } | null>(null);
  const { activeCompany } = useCompany();
  const { settings: companySettings } = useCompanySettings();
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [invoicing, setInvoicing] = useState(false);

  const handleValidate = async (d: any) => {
    await deliveries.validateDelivery(d.id, stock.deductStock, stock.releaseReservation);
  };

  const handlePrint = async (d: any, download = false) => {
    const { data: lines } = await (supabase as any)
      .from("delivery_lines")
      .select("*, product:products(code,name,unit,tva_rate)")
      .eq("delivery_id", d.id)
      .order("sort_order");
    await printDeliveryPdf(d, lines || [], activeCompany?.id, download);
  };

  // Selection logic
  const invoiceableItems = deliveries.items.filter((d: any) => d.status === "validated" && !d.invoice_id);
  const allInvoiceableSelected = invoiceableItems.length > 0 && invoiceableItems.every((d: any) => selectedIds.has(d.id));

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allInvoiceableSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(invoiceableItems.map((d: any) => d.id)));
    }
  };

  const handleSingleInvoice = async (d: any) => {
    if (d.invoice_id) {
      toast({ title: "Information", description: "Ce bon de livraison est déjà totalement facturé." });
      return;
    }
    if (invoicing) return;
    setInvoicing(true);
    const inv = await createInvoiceFromDeliveries([d.id], activeCompany?.id ?? null);
    if (inv) {
      await deliveries.fetch();
      navigate("/facturation/clients");
    }
    setInvoicing(false);
  };

  const handleMultiInvoice = async () => {
    if (invoicing || selectedIds.size === 0) return;
    setInvoicing(true);
    const inv = await createInvoiceFromDeliveries(Array.from(selectedIds), activeCompany?.id ?? null);
    if (inv) {
      setSelectedIds(new Set());
      await deliveries.fetch();
      navigate("/facturation/clients");
    }
    setInvoicing(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Bons de livraison</h2>
        {selectedIds.size > 0 && (
          <Button
            size="sm"
            variant="default"
            onClick={handleMultiInvoice}
            disabled={invoicing}
          >
            {invoicing ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileText className="h-3.5 w-3.5 mr-1" />}
            Facturer {selectedIds.size} BL
          </Button>
        )}
      </div>

      {deliveries.loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : deliveries.items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Aucun bon de livraison</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allInvoiceableSelected && invoiceableItems.length > 0}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Sélectionner tout"
                  />
                </TableHead>
                <TableHead>N°</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Dépôt</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.items.map((d: any) => {
                const canSelect = d.status === "validated" && !d.invoice_id;
                return (
                  <TableRow key={d.id} className="hover:bg-muted/30">
                    <TableCell>
                      {canSelect ? (
                        <Checkbox
                          checked={selectedIds.has(d.id)}
                          onCheckedChange={() => toggleSelect(d.id)}
                          aria-label={`Sélectionner ${d.delivery_number}`}
                        />
                      ) : (
                        <Checkbox disabled checked={false} />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-medium">{d.delivery_number}</TableCell>
                    <TableCell>{d.customer?.name || "—"}</TableCell>
                    <TableCell>{d.delivery_date}</TableCell>
                    <TableCell>{d.warehouse?.name || "—"}</TableCell>
                    <TableCell>
                      <Badge className={`${DELIVERY_STATUS_COLORS[d.status] || ""} border text-xs`}>
                        {DELIVERY_STATUS_LABELS[d.status] || d.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {onView && (
                          <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => onView(d.id)}>
                            <Eye className="h-3.5 w-3.5 mr-1" /> Ouvrir
                          </Button>
                        )}
                        <PrintButton iconOnly onPrint={() => handlePrint(d)} onDownload={() => handlePrint(d, true)} />
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Pièces jointes"
                          onClick={() => setAttachDialog({ id: d.id, number: d.delivery_number })}>
                          <Paperclip className="h-3.5 w-3.5" />
                        </Button>
                        {d.status === "draft" && (
                          <Button size="sm" variant="outline" className="h-8 text-xs"
                            onClick={() => handleValidate(d)}>
                            <Check className="h-3 w-3 mr-1" /> Valider
                          </Button>
                        )}
                        {d.status === "validated" && !d.invoice_id && (
                          <Button size="sm" variant="outline" className="h-8 text-xs"
                            disabled={invoicing}
                            onClick={() => handleSingleInvoice(d)}>
                            <FileText className="h-3 w-3 mr-1" /> Facturer
                          </Button>
                        )}
                        {d.invoice_id && <Badge variant="outline" className="text-xs">Facturé</Badge>}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {attachDialog && (
        <DocAttachmentsDialog
          open={!!attachDialog} onClose={() => setAttachDialog(null)}
          docType="delivery" docId={attachDialog.id} docNumber={attachDialog.number}
          companyId={activeCompany?.id}
        />
      )}
    </div>
  );
}
