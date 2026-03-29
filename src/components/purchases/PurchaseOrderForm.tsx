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
import { Plus, Trash2, Loader2, Lock } from "lucide-react";
import { calcPurchaseTotals, type PurchaseLine } from "@/hooks/usePurchases";
import { useAuth } from "@/hooks/useAuth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { GlobalDiscountSection, type GlobalDiscount, calcTotalsWithGlobalDiscount } from "@/components/GlobalDiscountSection";
import { DocumentTotalsBlock } from "@/components/DocumentTotalsBlock";

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

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editItem ? `Modifier BC — ${editItem.number}` : "Nouveau bon de commande fournisseur"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Fournisseur <span className="text-destructive">*</span></Label>
              <SearchableSelect options={supplierOptions} value={supplierId} onValueChange={handleSupplierChange} placeholder="Sélectionner..." /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-1.5">
                Conditions de paiement
                {!canEditPaymentTerms && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>Seul un Gérant ou Admin peut modifier ce champ</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </Label>
              {canEditPaymentTerms ? (
                <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {paymentTermsOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={currentPTLabel} disabled className="bg-muted" />
              )}
            </div>
            <div><Label>Date livraison prévue</Label><Input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} /></div>
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
      </DialogContent>
    </Dialog>
  );
}
