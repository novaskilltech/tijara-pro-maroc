import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { SalesDoc, SalesDocLine, calcTotals, calcLine, QUOTATION_STATUS_LABELS, QUOTATION_STATUS_COLORS } from "@/hooks/useSales";
import { DocAttachmentsDialog } from "@/components/DocAttachmentsDialog";
import { useCompany } from "@/hooks/useCompany";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { generateDocumentPdf } from "@/lib/pdf-generator";
import { AuditLogViewer } from "@/components/system/AuditLogViewer";
import {
  ArrowLeft, Send, Check, X, ArrowRight, Printer, Paperclip, Plus, Trash2, Loader2,
  FileText, Building2, Calendar, ChevronRight,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { emailService } from "@/services/emailService";
import { fetchCompany, fetchDefaultBank } from "@/lib/pdf/index";

interface Props {
  quotation: SalesDoc;
  hook: any;
  onBack: () => void;
  onConvertedToOrder?: (soId: string) => void;
}

const PAYMENT_TERMS = ["Comptant", "7j", "15j", "30j", "45j", "60j", "90j"];

export function QuotationDetailPage({ quotation, hook, onBack, onConvertedToOrder }: Props) {
  const [lines, setLines] = useState<SalesDocLine[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState(quotation.customer_id);
  const [warehouseId, setWarehouseId] = useState(quotation.warehouse_id || "");
  const [validityDate, setValidityDate] = useState(quotation.validity_date || "");
  const [paymentTerms, setPaymentTerms] = useState(quotation.payment_terms || "30j");
  const [notes, setNotes] = useState(quotation.notes || "");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAttach, setShowAttach] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [convertDialog, setConvertDialog] = useState(false);
  const [convertWh, setConvertWh] = useState("");
  const [dirty, setDirty] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const { activeCompany } = useCompany();
  const { settings: companySettings } = useCompanySettings();
  const navigate = useNavigate();

  const isEditable = ["draft", "sent"].includes(quotation.status);
  const isLocked = ["cancelled", "expired", "converted"].includes(quotation.status);

  const companyId = activeCompany?.id ?? null;

  useEffect(() => {
    if (!companyId) return;
    Promise.all([
      (supabase as any).from("customers").select("id, name, code").eq("is_active", true).eq("company_id", companyId).order("name"),
      (supabase as any).from("products").select("id, name, code, sale_price, tva_rate").eq("is_active", true).eq("company_id", companyId).order("name"),
      (supabase as any).from("warehouses").select("id, name").eq("is_active", true).eq("company_id", companyId),
      hook.getLines(quotation.id),
    ]).then(([custRes, prodRes, whRes, linesData]) => {
      setCustomers(custRes.data || []);
      setProducts(prodRes.data || []);
      setWarehouses(whRes.data || []);
      if (!convertWh && whRes.data?.length) setConvertWh(whRes.data[0].id);
      setLines(linesData || []);
      setLoading(false);
    });
  }, [quotation.id, companyId]);

  const customerOptions = customers.map(c => ({ value: c.id, label: `${c.code} — ${c.name}` }));
  const productOptions = products.map(p => ({ value: p.id, label: `${p.code} — ${p.name}` }));

  const updateLine = (idx: number, field: string, value: any) => {
    const updated = [...lines];
    (updated[idx] as any)[field] = value;
    if (field === "product_id") {
      const p = products.find(pr => pr.id === value);
      if (p) {
        updated[idx].description = p.name;
        updated[idx].unit_price = Number(p.sale_price);
        updated[idx].tva_rate = Number(p.tva_rate);
      }
    }
    setLines(updated);
    setDirty(true);
  };

  const addLine = () => {
    setLines([...lines, {
      product_id: null, description: "", quantity: 1, unit_price: 0,
      discount_percent: 0, tva_rate: 20, total_ht: 0, total_tva: 0, total_ttc: 0,
      sort_order: lines.length,
    }]);
    setDirty(true);
  };

  const removeLine = (idx: number) => { setLines(lines.filter((_, i) => i !== idx)); setDirty(true); };

  const { subtotal_ht, total_tva, total_ttc } = calcTotals(lines);

  const handleSave = async () => {
    setSaving(true);
    await hook.update(quotation.id, { customerId, warehouseId: warehouseId || undefined, lines, notes, paymentTerms, validityDate });
    setSaving(false);
    setDirty(false);
  };

  const handleMarkSent = async () => {
    if (dirty) await handleSave();
    await hook.markSent(quotation.id);
  };

  const handleConfirm = async () => {
    if (dirty) await handleSave();
    await hook.confirm(quotation.id);
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) return;
    await hook.cancel(quotation.id, cancelReason);
    setCancelDialog(false);
    onBack();
  };

  const handleConvert = async () => {
    const so = await hook.convertToOrder(quotation.id, convertWh);
    setConvertDialog(false);
    if (so && onConvertedToOrder) onConvertedToOrder(so.id);
  };

  const handleConvertToDelivery = async () => {
    const del = await hook.convertQuotationToDelivery(quotation.id, convertWh || warehouseId);
    if (del) navigate("/ventes/livraisons");
  };

  const handleConvertToInvoice = async () => {
    const inv = await hook.convertQuotationToInvoice(quotation.id, convertWh || warehouseId);
    if (inv) navigate("/facturation/clients");
  };

  const handlePrint = async () => {
    if (!companySettings) return;
    await generateDocumentPdf({
      type: "devis",
      number: quotation.number,
      date: quotation.date,
      clientName: customers.find(c => c.id === customerId)?.name || quotation.customer?.name || "—",
      lines: calcTotals(lines).lines.map(l => ({
        description: l.description,
        quantity: l.quantity,
        unit_price: l.unit_price,
        discount_percent: l.discount_percent,
        tva_rate: l.tva_rate,
        total_ht: l.total_ht,
        total_ttc: l.total_ttc,
      })),
      subtotalHt: subtotal_ht,
      totalTva: total_tva,
      totalTtc: total_ttc,
      notes,
      paymentTerms,
    }, companySettings);
  };

  const handleSendEmail = async () => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer?.email) {
      toast({
        title: "Email manquant",
        description: "Le client n'a pas d'adresse email configurée.",
        variant: "destructive",
      });
      return;
    }

    setSendingEmail(true);
    try {
      const [company, bank] = await Promise.all([
        fetchCompany(companyId),
        fetchDefaultBank(companyId),
      ]);

      if (!company) throw new Error("Company data not found");

      const data = {
        type: "devis" as any,
        number: quotation.number,
        date: quotation.date,
        dueDate: quotation.validity_date,
        paymentTerms: paymentTerms,
        party: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
        },
        lines: calcTotals(lines).lines.map(l => ({
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          discount_percent: l.discount_percent,
          tva_rate: l.tva_rate,
          total_ht: l.total_ht,
          total_ttc: l.total_ttc,
        })),
        subtotalHt: subtotal_ht,
        totalTva: total_tva,
        totalTtc: total_ttc,
        notes,
        company,
        bankAccount: bank,
      };

      await emailService.sendDocument(data, customer.email);
    } catch (err) {
      console.error("Email send error:", err);
    } finally {
      setSendingEmail(false);
    }
  };

  const statusCfg = {
    color: QUOTATION_STATUS_COLORS[quotation.status] || "bg-muted text-muted-foreground",
    label: QUOTATION_STATUS_LABELS[quotation.status] || quotation.status,
  };

  return (
    <AppLayout title={quotation.number} subtitle="Devis client">
      <div className="space-y-6">
        {/* Header bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="h-8 px-2">
              <ArrowLeft className="h-4 w-4 mr-1" /> Retour
            </Button>
            <Badge className={`${statusCfg.color} border text-sm px-3 py-1`}>{statusCfg.label}</Badge>
            {quotation.sales_order_id && (
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate("/ventes/commandes")}>
                <FileText className="h-3.5 w-3.5 mr-1" /> Voir le BC →
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Print */}
            <Button variant="outline" size="sm" className="h-9" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" /> Imprimer
            </Button>

            {/* Email */}
            <Button variant="outline" size="sm" className="h-9" onClick={handleSendEmail} disabled={sendingEmail}>
              {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              Envoyer par email
            </Button>

            {/* Attachments */}
            <Button variant="outline" size="sm" className="h-9" onClick={() => setShowAttach(true)}>
              <Paperclip className="h-4 w-4 mr-1" /> Pièces jointes
            </Button>

            {/* Save */}
            {isEditable && (
              <Button variant="outline" size="sm" className="h-9" onClick={handleSave} disabled={saving || !dirty}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Enregistrer
              </Button>
            )}

            {/* Mark Sent */}
            {quotation.status === "draft" && (
              <Button size="sm" className="h-9" variant="outline" onClick={handleMarkSent}>
                <Send className="h-4 w-4 mr-1" /> Marquer comme Envoyé
              </Button>
            )}

            {/* Confirm */}
            {(quotation.status === "draft" || quotation.status === "sent") && (
              <Button size="sm" className="h-9" onClick={handleConfirm}>
                <Check className="h-4 w-4 mr-1" /> Confirmer Devis
              </Button>
            )}

            {/* Create BC / BL / FAC */}
            {quotation.status === "confirmed" && !quotation.sales_order_id && (
              <div className="flex items-center border rounded-md overflow-hidden bg-primary text-primary-foreground shadow-sm h-9">
                <Button 
                  size="sm" 
                  className="h-full px-3 text-xs rounded-none border-r border-primary-foreground/20 hover:bg-primary/90" 
                  variant="ghost"
                  onClick={() => setConvertDialog(true)}
                >
                  <ArrowRight className="h-4 w-4 mr-1" /> Créer BC
                </Button>
                <Button 
                  size="sm" 
                  className="h-full px-3 text-xs rounded-none border-r border-primary-foreground/20 hover:bg-primary/90" 
                  variant="ghost"
                  onClick={handleConvertToDelivery}
                  title="Directement vers Bon de Livraison"
                >
                  Créer BL
                </Button>
                <Button 
                  size="sm" 
                  className="h-full px-3 text-xs rounded-none bg-emerald-600 hover:bg-emerald-700 font-medium" 
                  variant="ghost"
                  onClick={handleConvertToInvoice}
                  title="Directement vers Facture"
                >
                  <FileText className="h-3.5 w-3.5 mr-1" /> Facture Express
                </Button>
              </div>
            )}

            {/* Cancel */}
            {!isLocked && (
              <Button size="sm" variant="destructive" className="h-9" onClick={() => setCancelDialog(true)}>
                <X className="h-4 w-4 mr-1" /> Annuler
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* Smart link breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-4 py-2 border">
          <span className="font-medium text-primary">Devis</span>
          <ChevronRight className="h-3 w-3" />
          <span className={quotation.sales_order_id ? "font-medium text-foreground cursor-pointer hover:text-primary" : "opacity-40"}>
            BC Client
          </span>
          <ChevronRight className="h-3 w-3" />
          <span className="opacity-40">Bon de Livraison</span>
          <ChevronRight className="h-3 w-3" />
          <span className="opacity-40">Facture Client</span>
        </div>

        {/* Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-card border rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" /> Informations client
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Client <span className="text-destructive">*</span></Label>
                  <SearchableSelect
                    options={customerOptions}
                    value={customerId}
                    onValueChange={v => { setCustomerId(v); setDirty(true); }}
                    placeholder="Sélectionner un client..."
                    disabled={isLocked}
                  />
                </div>
                <div>
                  <Label>Dépôt</Label>
                  <Select value={warehouseId || "none"} onValueChange={v => { setWarehouseId(v === "none" ? "" : v); setDirty(true); }} disabled={isLocked}>
                    <SelectTrigger><SelectValue placeholder="Dépôt..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Aucun —</SelectItem>
                      {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Conditions de paiement</Label>
                  <Select value={paymentTerms} onValueChange={v => { setPaymentTerms(v); setDirty(true); }} disabled={isLocked}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date de validité</Label>
                  <Input
                    type="date"
                    value={validityDate}
                    onChange={e => { setValidityDate(e.target.value); setDirty(true); }}
                    disabled={isLocked}
                  />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={e => { setNotes(e.target.value); setDirty(true); }}
                  rows={2}
                  disabled={isLocked}
                  placeholder="Notes internes ou conditions..."
                />
              </div>
            </div>

            {/* Lines */}
            <div className="bg-card border rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Lignes de devis</h3>
              {loading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (
                <>
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-1 text-xs font-medium text-muted-foreground px-1">
                    <div className="col-span-3">Produit</div>
                    <div className="col-span-3">Description</div>
                    <div className="col-span-1 text-center">Qté</div>
                    <div className="col-span-2 text-right">Prix unit.</div>
                    <div className="col-span-1 text-center">Rem%</div>
                    <div className="col-span-1 text-center">TVA%</div>
                    <div className="col-span-1"></div>
                  </div>
                  {lines.map((line, idx) => {
                    const calc = calcLine(line);
                    return (
                      <div key={idx} className="grid grid-cols-12 gap-1 items-center bg-muted/20 rounded-lg p-2">
                        <div className="col-span-3">
                          <SearchableSelect
                            options={productOptions}
                            value={line.product_id || ""}
                            onValueChange={v => updateLine(idx, "product_id", v)}
                            placeholder="Produit..."
                            disabled={isLocked}
                          />
                        </div>
                        <div className="col-span-3">
                          <Input className="h-8 text-xs" placeholder="Description" value={line.description}
                            onChange={e => updateLine(idx, "description", e.target.value)} disabled={isLocked} />
                        </div>
                        <div className="col-span-1">
                          <Input className="h-8 text-xs text-center" type="number" min={0} value={line.quantity}
                            onChange={e => updateLine(idx, "quantity", Number(e.target.value))} disabled={isLocked} />
                        </div>
                        <div className="col-span-2">
                          <Input className="h-8 text-xs text-right" type="number" min={0} value={line.unit_price}
                            onChange={e => updateLine(idx, "unit_price", Number(e.target.value))} disabled={isLocked} />
                        </div>
                        <div className="col-span-1">
                          <Input className="h-8 text-xs text-center" type="number" min={0} max={100} value={line.discount_percent}
                            onChange={e => updateLine(idx, "discount_percent", Number(e.target.value))} disabled={isLocked} />
                        </div>
                        <div className="col-span-1">
                          <Input className="h-8 text-xs text-center" type="number" min={0} value={line.tva_rate}
                            onChange={e => updateLine(idx, "tva_rate", Number(e.target.value))} disabled={isLocked} />
                        </div>
                        <div className="col-span-1 flex justify-end">
                          {!isLocked && (
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => removeLine(idx)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {!isLocked && (
                    <Button size="sm" variant="outline" onClick={addLine} className="text-xs">
                      <Plus className="h-3 w-3 mr-1" /> Ajouter une ligne
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Sidebar: totals + info */}
          <div className="space-y-4">
            <div className="bg-card border rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Totaux</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Sous-total HT</span>
                  <span className="font-medium text-foreground">{subtotal_ht.toLocaleString("fr-MA")} MAD</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>TVA</span>
                  <span className="font-medium text-foreground">{total_tva.toLocaleString("fr-MA")} MAD</span>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>Total TTC</span>
                  <span className="text-primary">{total_ttc.toLocaleString("fr-MA")} MAD</span>
                </div>
              </div>
            </div>

            <div className="bg-card border rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" /> Infos document
              </h3>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Référence</span>
                  <span className="font-mono font-medium text-foreground">{quotation.number}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date</span>
                  <span className="text-foreground">{quotation.date}</span>
                </div>
                {quotation.validity_date && (
                  <div className="flex justify-between">
                    <span>Validité</span>
                    <span className="text-foreground">{quotation.validity_date}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Statut</span>
                  <Badge className={`${QUOTATION_STATUS_COLORS[quotation.status]} border text-xs`}>
                    {QUOTATION_STATUS_LABELS[quotation.status]}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Audit Logs */}
            <div className="bg-card border rounded-xl overflow-hidden h-[400px]">
              <AuditLogViewer 
                tableName="quotations" 
                recordId={quotation.id} 
                companyId={companyId} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Attachments dialog */}
      {showAttach && (
        <DocAttachmentsDialog
          open
          onClose={() => setShowAttach(false)}
          docType="quotation"
          docId={quotation.id}
          docNumber={quotation.number}
          companyId={activeCompany?.id}
        />
      )}

      {/* Cancel dialog */}
      <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Annuler le devis</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Veuillez indiquer le motif d'annulation (obligatoire).</p>
          <Textarea
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
            placeholder="Motif d'annulation..."
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(false)}>Retour</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={!cancelReason.trim()}>Confirmer l'annulation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Order dialog */}
      <Dialog open={convertDialog} onOpenChange={setConvertDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Créer un Bon de Commande</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Sélectionnez le dépôt pour le bon de commande :</p>
          <Select value={convertWh} onValueChange={setConvertWh}>
            <SelectTrigger><SelectValue placeholder="Dépôt..." /></SelectTrigger>
            <SelectContent>
              {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertDialog(false)}>Annuler</Button>
            <Button onClick={handleConvert} disabled={!convertWh}>
              <ArrowRight className="h-4 w-4 mr-1" /> Créer le BC (Brouillon)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
