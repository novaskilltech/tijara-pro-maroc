import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { InvoiceLineEditor } from "./InvoiceLineEditor";
import { DocumentAttachmentsPanel } from "@/components/DocumentAttachmentsPanel";
import { INVOICE_STATUS_LABELS, type Invoice, type InvoiceLine } from "@/types/invoice";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";
import { CheckCircle, XCircle, CreditCard, FileText, Loader2, Banknote, Mail } from "lucide-react";
import { PrintButton } from "@/components/PrintButton";
import { printInvoicePdf, fetchCompany, fetchDefaultBank } from "@/lib/pdf";
import { emailService } from "@/services/emailService";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuditLogViewer } from "@/components/system/AuditLogViewer";

interface InvoiceDetailDialogProps {
  invoice: Invoice | null;
  lines: InvoiceLine[];
  products: any[];
  onClose: () => void;
  onValidate: (id: string) => Promise<boolean>;
  onCancel: (id: string) => Promise<boolean>;
  onMarkPaid: (id: string) => Promise<boolean>;
  onCreateCreditNote: (invoice: Invoice) => void;
}

export function InvoiceDetailDialog({
  invoice, lines, products, onClose, onValidate, onCancel, onMarkPaid, onCreateCreditNote,
}: InvoiceDetailDialogProps) {
  const { isAdmin } = useAuth();
  const { activeCompany } = useCompany();
  const navigate = useNavigate();
  const [acting, setActing] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  if (!invoice) return null;

  const isDraft = invoice.status === "draft";
  const isValidated = invoice.status === "validated";

  const statusColor = {
    draft: "secondary" as const,
    validated: "default" as const,
    cancelled: "destructive" as const,
    paid: "default" as const,
  };

  const handleAction = async (action: () => Promise<boolean>) => {
    setActing(true);
    await action();
    setActing(false);
    onClose();
  };

  const handleSendEmail = async () => {
    const contactEmail = invoice.customer?.email || invoice.supplier?.email;
    if (!contactEmail) {
      toast({
        title: "Email manquant",
        description: "Le tiers n'a pas d'adresse email configurée.",
        variant: "destructive",
      });
      return;
    }

    setSendingEmail(true);
    try {
      const [company, bank] = await Promise.all([
        fetchCompany(activeCompany?.id),
        fetchDefaultBank(activeCompany?.id),
      ]);

      if (!company) throw new Error("Company data not found");

      const data = {
        type: (invoice.invoice_type === "client" ? "facture_client" : "facture_fournisseur") as any,
        number: invoice.invoice_number,
        date: invoice.invoice_date,
        party: {
          name: invoice.customer?.name || invoice.supplier?.name || "Client",
          email: contactEmail,
          phone: invoice.customer?.phone || invoice.supplier?.phone,
          address: invoice.customer?.address || invoice.supplier?.address,
        },
        lines: lines.map(l => ({
          description: l.description,
          quantity: Number(l.quantity),
          unit_price: Number(l.unit_price),
          discount_percent: Number(l.discount_percent || 0),
          tva_rate: Number(l.tva_rate),
          total_ht: Number(l.total_ht),
          total_ttc: Number(l.total_ttc),
        })),
        subtotalHt: invoice.subtotal_ht,
        totalTva: invoice.total_tva,
        totalTtc: invoice.total_ttc,
        notes: invoice.notes,
        company,
        bankAccount: bank,
      };

      await emailService.sendDocument(data, contactEmail);
    } catch (err) {
      console.error("Email send error:", err);
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <Dialog open={!!invoice} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <DialogTitle>{invoice.invoice_number}</DialogTitle>
              <Badge variant={statusColor[invoice.status]}>{INVOICE_STATUS_LABELS[invoice.status]}</Badge>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <PrintButton
                onPrint={() => printInvoicePdf(invoice.id, invoice, lines, activeCompany?.id, false)}
                onDownload={() => printInvoicePdf(invoice.id, invoice, lines, activeCompany?.id, true)}
              />
              <Button variant="outline" size="sm" onClick={handleSendEmail} disabled={sendingEmail} className="gap-1">
                {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Email
              </Button>
              {isDraft && (
                <Button onClick={() => handleAction(() => onValidate(invoice.id))} disabled={acting} size="sm" className="gap-1">
                  {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} Valider
                </Button>
              )}
              {isValidated && (
                <>
                  {invoice.remaining_balance > 0 ? (
                    <Button variant="outline" size="sm" onClick={() => {
                      onClose();
                      navigate("/reglements/encaissements", {
                        state: {
                          prefill: {
                            customerId: invoice.customer_id,
                            invoiceId: invoice.id,
                            invoiceNumber: invoice.invoice_number,
                            remainingBalance: invoice.remaining_balance,
                          },
                        },
                      });
                    }} className="gap-1">
                      <Banknote className="h-4 w-4" /> Payer la facture
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" disabled className="gap-1">
                      <CreditCard className="h-4 w-4" /> Cette facture est déjà totalement réglée.
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => { onCreateCreditNote(invoice); onClose(); }} className="gap-1">
                    <FileText className="h-4 w-4" /> Créer un avoir
                  </Button>
                </>
              )}
              {(isDraft || (isValidated && isAdmin())) && (
                <Button variant="destructive" size="sm" onClick={() => handleAction(() => onCancel(invoice.id))} disabled={acting} className="gap-1">
                  <XCircle className="h-4 w-4" /> Annuler
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onClose}>Fermer</Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Détails</TabsTrigger>
            <TabsTrigger value="attachments">Pièces jointes</TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="mt-4 space-y-4">
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Tiers</span>
                <p className="font-medium">{invoice.customer?.name || invoice.supplier?.name || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Date</span>
                <p className="font-medium">{invoice.invoice_date}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Échéance</span>
                <p className="font-medium">{invoice.due_date || "—"}</p>
              </div>
            </div>

            <div className="mt-4">
              <InvoiceLineEditor lines={lines} onChange={() => {}} products={products} invoiceType={invoice.invoice_type} readOnly />
            </div>

            <div className="flex justify-end mt-4">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Total HT</span><span>{invoice.subtotal_ht.toFixed(2)} MAD</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">TVA</span><span>{invoice.total_tva.toFixed(2)} MAD</span></div>
                <div className="flex justify-between border-t pt-1 text-base"><span className="font-semibold">Total TTC</span><span className="font-bold text-primary">{invoice.total_ttc.toFixed(2)} MAD</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Solde restant</span><span className="font-medium">{invoice.remaining_balance.toFixed(2)} MAD</span></div>
              </div>
            </div>

            {invoice.notes && (
              <div className="mt-4 text-sm">
                <span className="text-muted-foreground">Notes :</span>
                <p>{invoice.notes}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="attachments" className="mt-4">
            <DocumentAttachmentsPanel
              docType="invoice"
              docId={invoice.id}
              companyId={activeCompany?.id}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <div className="border rounded-xl overflow-hidden h-[400px]">
              <AuditLogViewer 
                tableName="invoices" 
                recordId={invoice.id} 
                companyId={activeCompany?.id} 
              />
            </div>
          </TabsContent>
        </Tabs>

        
      </DialogContent>
    </Dialog>
  );
}
