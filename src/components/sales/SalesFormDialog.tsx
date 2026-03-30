import { useState, useEffect } from "react";
import { isCustomerBlocked } from "@/lib/blocked-check";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { SalesDocLine, calcTotals } from "@/hooks/useSales";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { GlobalDiscountSection, type GlobalDiscount, calcTotalsWithGlobalDiscount } from "@/components/GlobalDiscountSection";
import { DocumentTotalsBlock } from "@/components/DocumentTotalsBlock";

interface Props {
  type: "quotation" | "order";
  onClose: () => void;
  onSubmit: (customerId: string, lines: SalesDocLine[], notes?: string, terms?: string, globalDiscount?: GlobalDiscount) => Promise<void>;
}

export function SalesFormDialog({ type, onClose, onSubmit }: Props) {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? null;
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("30j");
  const [globalDiscount, setGlobalDiscount] = useState<GlobalDiscount>({ type: "percentage", value: 0 });
  const [lines, setLines] = useState<SalesDocLine[]>([
    { product_id: null, description: "", quantity: 1, unit_price: 0, discount_percent: 0, tva_rate: 20, total_ht: 0, total_tva: 0, total_ttc: 0, sort_order: 0 },
  ]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    (supabase as any).from("customers").select("id, name, code").eq("is_active", true).eq("company_id", companyId).order("name").then(({ data }: any) => setCustomers(data || []));
    (supabase as any).from("products").select("id, name, code, sale_price, tva_rate").eq("is_active", true).eq("company_id", companyId).order("name").then(({ data }: any) => setProducts(data || []));
  }, [companyId]);

  const customerOptions = customers.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }));
  const productOptions = products.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }));

  // Anti-duplicate filter for products
  const selectedProductIds = lines.map(l => l.product_id).filter(Boolean);
  const getProductOptions = (currentProductId: string | null | undefined) => {
    return products
      .filter(p => !selectedProductIds.includes(p.id) || p.id === currentProductId)
      .map(p => ({ value: p.id, label: `${p.code} — ${p.name}` }));
  };

  const updateLine = (idx: number, field: string, value: any) => {
    const updated = [...lines];
    (updated[idx] as any)[field] = value;
    if (field === "product_id") {
      const p = products.find((p: any) => p.id === value);
      if (p) {
        updated[idx].description = p.name;
        updated[idx].unit_price = Number(p.sale_price);
        updated[idx].tva_rate = Number(p.tva_rate);
      }
    }
    setLines(updated);
  };

  const addLine = () => setLines([...lines, { product_id: null, description: "", quantity: 1, unit_price: 0, discount_percent: 0, tva_rate: 20, total_ht: 0, total_tva: 0, total_ttc: 0, sort_order: lines.length }]);
  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));

  const { lines: calcedLines } = calcTotals(lines);
  const totals = calcTotalsWithGlobalDiscount(calcedLines, globalDiscount.type, globalDiscount.value);

  const handleSubmit = async () => {
    if (!customerId) return;
    if (await isCustomerBlocked(customerId)) return;
    if (submitting) return; // Prevent double-submit
    setSubmitting(true);
    try {
      await onSubmit(customerId, lines, notes, terms, globalDiscount);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{type === "quotation" ? "Nouveau Devis" : "Nouveau Bon de commande"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Client</Label>
              <SearchableSelect
                options={customerOptions}
                value={customerId}
                onValueChange={setCustomerId}
                placeholder="Rechercher un client..."
              />
            </div>
            <div>
              <Label>Conditions de paiement</Label>
              <Select value={terms} onValueChange={setTerms}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="comptant">Comptant</SelectItem>
                  <SelectItem value="30j">30 jours</SelectItem>
                  <SelectItem value="60j">60 jours</SelectItem>
                  <SelectItem value="90j">90 jours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Lignes</Label>
            {lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-3">
                  <SearchableSelect
                    options={getProductOptions(line.product_id)}
                    value={line.product_id || ""}
                    onValueChange={(v) => updateLine(idx, "product_id", v)}
                    placeholder="Produit..."
                  />
                </div>
                <div className="col-span-3">
                  <Input className="h-9 text-xs" placeholder="Description" value={line.description} onChange={(e) => updateLine(idx, "description", e.target.value)} />
                </div>
                <div className="col-span-1">
                  <Input className="h-9 text-xs" type="number" placeholder="Qté" value={line.quantity} onChange={(e) => updateLine(idx, "quantity", Number(e.target.value))} />
                </div>
                <div className="col-span-2">
                  <Input className="h-9 text-xs" type="number" placeholder="PU" value={line.unit_price} onChange={(e) => updateLine(idx, "unit_price", Number(e.target.value))} />
                </div>
                <div className="col-span-1">
                  <Input className="h-9 text-xs" type="number" placeholder="Rem%" value={line.discount_percent} onChange={(e) => updateLine(idx, "discount_percent", Number(e.target.value))} />
                </div>
                <div className="col-span-1">
                  <Input className="h-9 text-xs" type="number" placeholder="TVA%" value={line.tva_rate} onChange={(e) => updateLine(idx, "tva_rate", Number(e.target.value))} />
                </div>
                <div className="col-span-1">
                  <Button size="sm" variant="ghost" onClick={() => removeLine(idx)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={addLine}><Plus className="h-3 w-3 mr-1" /> Ligne</Button>
          </div>

          <GlobalDiscountSection
            discount={globalDiscount}
            onChange={setGlobalDiscount}
            maxAmount={totals.subtotalHtBrut}
          />

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <div className="flex justify-between items-end pt-4 border-t">
            <DocumentTotalsBlock
              subtotalHtBrut={totals.subtotalHtBrut}
              globalDiscountAmount={totals.globalDiscountAmount}
              subtotalHt={totals.subtotalHt}
              totalTva={totals.totalTva}
              totalTtc={totals.totalTtc}
            />
            <div className="space-x-2">
              <Button variant="outline" onClick={onClose} disabled={submitting}>Annuler</Button>
              <Button onClick={handleSubmit} disabled={submitting || !customerId}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
