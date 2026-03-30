import { useEffect, useState } from "react";
import { isSupplierBlocked } from "@/lib/blocked-check";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { Plus, Trash2, Loader2, Lock, Building2, User2, Calendar, Hash, Mail, Phone, MapPin, CreditCard } from "lucide-react";
import { calcPurchaseTotals, type PurchaseLine } from "@/hooks/usePurchases";
import { useAuth } from "@/hooks/useAuth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { GlobalDiscountSection, type GlobalDiscount, calcTotalsWithGlobalDiscount } from "@/components/GlobalDiscountSection";
import { DocumentTotalsBlock } from "@/components/DocumentTotalsBlock";
import { Separator } from "@/components/ui/separator";

interface Props { editItem: any | null; hook: any; onClose: () => void; }

const emptyLine = (): Partial<PurchaseLine> => ({
  product_id: null, description: "", quantity: 1, unit: "Unité", unit_price: 0, discount_percent: 0, tva_rate: 20,
  total_ht: 0, total_tva: 0, total_ttc: 0, sort_order: 0,
});

const SYSTEM_DEFAULT_PAYMENT_TERMS = "30j";

export function PurchaseOrderForm({ editItem, hook, onClose }: Props) {
  const { roles } = useAuth();
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? null;
  const canEditPaymentTerms = roles.some(r => ["super_admin", "admin", "manager"].includes(r));

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [paymentTermsOptions, setPaymentTermsOptions] = useState<{ value: string; label: string }[]>([]);
  const [supplierId, setSupplierId] = useState(editItem?.supplier_id || "");
  const [warehouseId, setWarehouseId] = useState(editItem?.warehouse_id || "");
  const [paymentTerms, setPaymentTerms] = useState(editItem?.payment_terms || SYSTEM_DEFAULT_PAYMENT_TERMS);
  const [expectedDate, setExpectedDate] = useState(editItem?.expected_delivery_date || "");
  const [notes, setNotes] = useState(editItem?.notes || "");
  const [lines, setLines] = useState<Partial<PurchaseLine>[]>([emptyLine()]);
  const [globalDiscount, setGlobalDiscount] = useState<GlobalDiscount>({
    type: (editItem?.global_discount_type || "percentage") as "percentage" | "fixed",
    value: Number(editItem?.global_discount_value) || 0,
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!editItem);

  useEffect(() => {
    if (!companyId) return;
    (supabase as any).from("suppliers").select("id, name, code, payment_terms").eq("is_active", true).eq("company_id", companyId).order("name").then(({ data }: any) => setSuppliers(data || []));
    (supabase as any).from("warehouses").select("id, name").eq("is_active", true).eq("company_id", companyId).then(({ data }: any) => { setWarehouses(data || []); if (!editItem && data?.length) setWarehouseId(data[0].id); });
    (supabase as any).from("products").select("id, name, code, purchase_price, tva_rate").eq("is_active", true).eq("company_id", companyId).order("name").then(({ data }: any) => setProducts(data || []));
    (supabase as any).from("payment_terms").select("id, name, days").eq("is_active", true).order("sort_order").then(({ data }: any) => {
      if (data?.length) {
        const opts = data.map((pt: any) => ({
          value: pt.days === 0 ? "comptant" : `${pt.days}j`,
          label: pt.name,
        }));
        setPaymentTermsOptions(opts);
      } else {
        setPaymentTermsOptions([
          { value: "comptant", label: "Comptant" },
          { value: "30j", label: "30 jours" },
          { value: "60j", label: "60 jours" },
          { value: "90j", label: "90 jours" },
        ]);
      }
    });
    if (editItem) {
      hook.getLines(editItem.id).then((l: any[]) => {
        setLines(l.length ? l.map((r: any) => ({ product_id: r.product_id, description: r.description, quantity: r.quantity, unit: r.unit || "Unité", unit_price: r.unit_price, discount_percent: r.discount_percent, tva_rate: r.tva_rate, total_ht: r.total_ht, total_tva: r.total_tva, total_ttc: r.total_ttc, sort_order: r.sort_order })) : [emptyLine()]);
        setLoading(false);
      });
    }
  }, [companyId]);

  const handleSupplierChange = (id: string) => {
    setSupplierId(id);
    if (!editItem) {
      const supplier = suppliers.find((s: any) => s.id === id);
      if (supplier?.payment_terms) {
        setPaymentTerms(supplier.payment_terms);
      } else {
        setPaymentTerms(SYSTEM_DEFAULT_PAYMENT_TERMS);
      }
    }
  };

  const updateLine = (idx: number, field: string, value: any) => {
    const updated = [...lines];
    (updated[idx] as any)[field] = value;
    if (field === "product_id") {
      const p = products.find((pr: any) => pr.id === value);
      if (p) { updated[idx].description = p.name; updated[idx].unit_price = Number(p.purchase_price); updated[idx].tva_rate = Number(p.tva_rate); }
    }
    setLines(updated);
  };

  const { lines: calcedLines } = calcPurchaseTotals(lines as PurchaseLine[]);
  const totals = calcTotalsWithGlobalDiscount(calcedLines, globalDiscount.type, globalDiscount.value);

  const handleSave = async () => {
    if (!supplierId) return;
    if (await isSupplierBlocked(supplierId)) return;
    setSaving(true);
    if (editItem) {
      await hook.update(editItem.id, {
        supplier_id: supplierId, warehouse_id: warehouseId || null, payment_terms: paymentTerms,
        expected_delivery_date: expectedDate || null, notes,
        global_discount_type: globalDiscount.type,
        global_discount_value: globalDiscount.value,
        global_discount_amount: totals.globalDiscountAmount,
        subtotal_ht: totals.subtotalHt,
        total_tva: totals.totalTva,
        total_ttc: totals.totalTtc,
      }, lines);
    } else {
      await hook.create({
        supplierId, warehouseId, lines, notes, paymentTerms,
        expectedDeliveryDate: expectedDate || undefined,
        globalDiscount,
      });
    }
    setSaving(false);
    onClose();
  };

  const supplierOptions = suppliers.map(s => ({ value: s.id, label: `${s.code} — ${s.name}` }));
  const productOptions = products.map(p => ({ value: p.id, label: `${p.code} — ${p.name}` }));
  const currentPTLabel = paymentTermsOptions.find(o => o.value === paymentTerms)?.label || paymentTerms;

  const selectedSupplier = suppliers.find(s => s.id === supplierId);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[94vh] flex flex-col p-0 overflow-hidden bg-slate-50/50">
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto space-y-8 bg-white p-10 rounded-xl shadow-sm border border-slate-200">
            {/* Header: Issuer vs Supplier */}
            <div className="grid grid-cols-2 gap-12">
              {/* Left Column: Issuer (Company) */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-6">
                  {activeCompany?.logo_url ? (
                    <img src={activeCompany.logo_url} alt="Logo" className="h-16 w-auto object-contain" />
                  ) : (
                    <div className="h-16 w-16 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Building2 className="h-8 w-8 text-primary" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 leading-tight">{activeCompany?.raison_sociale || "Ma Société"}</h2>
                    <p className="text-sm font-medium text-primary uppercase tracking-wider">{activeCompany?.secteur || "Secteur d'activité"}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-slate-400 shrink-0" />
                    <span>{activeCompany?.address || "Adresse de la société"}, {activeCompany?.city || "Ville"}, {activeCompany?.country || "Maroc"}</span>
                  </div>
                  {activeCompany?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>{activeCompany.phone}</span>
                    </div>
                  )}
                  {activeCompany?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>{activeCompany.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Supplier Selection */}
              <div className="flex flex-col gap-4">
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 flex-1">
                  <div className="flex items-center gap-2 mb-4 text-slate-400">
                    <User2 className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-widest">Fournisseur / Destinataire</span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <SearchableSelect
                        options={supplierOptions}
                        value={supplierId}
                        onValueChange={handleSupplierChange}
                        placeholder="Sélectionner un fournisseur..."
                      />
                    </div>

                    {selectedSupplier && (
                      <div className="space-y-2 text-sm pt-2">
                        <p className="font-bold text-slate-900">{selectedSupplier.name}</p>
                        <p className="text-slate-600 line-clamp-2">{selectedSupplier.address}</p>
                        <p className="text-slate-600 font-medium">{selectedSupplier.email}</p>
                        <p className="text-slate-600">{selectedSupplier.phone}</p>
                        <div className="pt-2 flex gap-2">
                          <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-500">ICE: {selectedSupplier.ice || "-"}</span>
                          <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-500">IF: {selectedSupplier.if_number || "-"}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Document Title and Meta */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pt-6 border-t border-slate-100">
              <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">BON DE COMMANDE FOURNISSEUR</h1>
                <p className="text-slate-400 font-medium">Commande officielle émise auprès du fournisseur</p>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full md:w-auto min-w-[340px]">
                <div className="space-y-1.5 flex-1 shadow-sm px-4 py-3 bg-primary/5 rounded-xl border border-primary/10">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-primary/70 flex items-center gap-1.5">
                    <Hash className="h-3 w-3" /> Numéro de document
                  </Label>
                  <p className="text-lg font-black text-primary">{editItem?.number || "Brouillon — AUTO"}</p>
                </div>
                <div className="space-y-1.5 flex-1 shadow-sm px-4 py-3 bg-white rounded-xl border border-slate-200">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" /> Date d'émission
                  </Label>
                  <p className="text-lg font-bold text-slate-900">{new Date().toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Date livraison prévue</Label>
                <Input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} className="bg-white border-slate-200" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Conditions de paiement</Label>
                {canEditPaymentTerms ? (
                  <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                    <SelectTrigger className="bg-white border-slate-200"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {paymentTermsOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={currentPTLabel} disabled className="bg-muted" />
                )}
              </div>
            </div>

            {loading ? <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
              <div className="space-y-2">
                <Label>Lignes de commande</Label>
                <div className="space-y-1">
                  {lines.map((line, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-1 items-center bg-muted/30 p-2 rounded">
                      <div className="col-span-3"><SearchableSelect options={productOptions} value={line.product_id || ""} onValueChange={v => updateLine(idx, "product_id", v)} placeholder="Produit..." /></div>
                      <div className="col-span-3"><Input className="h-8 text-xs" placeholder="Description" value={line.description || ""} onChange={e => updateLine(idx, "description", e.target.value)} /></div>
                      <div className="col-span-1"><Input className="h-8 text-xs" type="number" placeholder="Qté" min={0} value={line.quantity || ""} onChange={e => updateLine(idx, "quantity", Number(e.target.value))} /></div>
                      <div className="col-span-2"><Input className="h-8 text-xs" type="number" placeholder="Prix unit." min={0} value={line.unit_price || ""} onChange={e => updateLine(idx, "unit_price", Number(e.target.value))} /></div>
                      <div className="col-span-2"><Input className="h-8 text-xs" type="number" placeholder="TVA%" min={0} value={line.tva_rate ?? ""} onChange={e => updateLine(idx, "tva_rate", Number(e.target.value))} /></div>
                      <div className="col-span-1 flex justify-end">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setLines(lines.filter((_, i) => i !== idx))}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button size="sm" variant="outline" onClick={() => setLines([...lines, emptyLine()])}><Plus className="h-3 w-3 mr-1" /> Ajouter une ligne</Button>
              </div>
            )}


            <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>

            <div className="flex justify-end pt-2 border-t">
              <DocumentTotalsBlock
                subtotalHtBrut={totals.subtotalHtBrut}
                globalDiscountAmount={totals.globalDiscountAmount}
                subtotalHt={totals.subtotalHt}
                totalTva={totals.totalTva}
                totalTtc={totals.totalTtc}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving || !supplierId}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Enregistrer
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
