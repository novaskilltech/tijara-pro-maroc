import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { SalesDocLine, calcTotals } from "@/hooks/useSales";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  type: "request" | "order";
  onClose: () => void;
  onSubmit: (supplierId: string, warehouseId: string, lines: SalesDocLine[], notes?: string) => Promise<void>;
}

export function PurchaseFormDialog({ type, onClose, onSubmit }: Props) {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? null;
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<SalesDocLine[]>([
    { product_id: null, description: "", quantity: 1, unit_price: 0, discount_percent: 0, tva_rate: 20, total_ht: 0, total_tva: 0, total_ttc: 0, sort_order: 0 },
  ]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    (supabase as any).from("suppliers").select("id, name, code").eq("is_active", true).eq("company_id", companyId).order("name").then(({ data }: any) => setSuppliers(data || []));
    (supabase as any).from("products").select("id, name, code, purchase_price, tva_rate").eq("is_active", true).eq("company_id", companyId).order("name").then(({ data }: any) => setProducts(data || []));
    (supabase as any).from("warehouses").select("id, name").eq("is_active", true).eq("company_id", companyId).then(({ data }: any) => { setWarehouses(data || []); if (data?.length) setWarehouseId(data[0].id); });
  }, [companyId]);

  const supplierOptions = suppliers.map((s) => ({ value: s.id, label: `${s.code} — ${s.name}` }));
  const productOptions = products.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }));

  const updateLine = (idx: number, field: string, value: any) => {
    const updated = [...lines];
    (updated[idx] as any)[field] = value;
    if (field === "product_id") {
      const p = products.find((p: any) => p.id === value);
      if (p) {
        updated[idx].description = p.name;
        updated[idx].unit_price = Number(p.purchase_price);
        updated[idx].tva_rate = Number(p.tva_rate);
      }
    }
    setLines(updated);
  };

  const addLine = () => setLines([...lines, { product_id: null, description: "", quantity: 1, unit_price: 0, discount_percent: 0, tva_rate: 20, total_ht: 0, total_tva: 0, total_ttc: 0, sort_order: lines.length }]);
  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));

  const { subtotal_ht, total_tva, total_ttc } = calcTotals(lines);

  const handleSubmit = async () => {
    if (type === "order" && !supplierId) return;
    setSubmitting(true);
    await onSubmit(supplierId, warehouseId, lines, notes);
    setSubmitting(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{type === "request" ? "Nouvelle demande d'achat" : "Nouveau BC fournisseur"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {type === "order" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fournisseur</Label>
                <SearchableSelect
                  options={supplierOptions}
                  value={supplierId}
                  onValueChange={setSupplierId}
                  placeholder="Rechercher un fournisseur..."
                />
              </div>
              <div>
                <Label>Dépôt de réception</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Lignes</Label>
            {lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-3">
                  <SearchableSelect
                    options={productOptions}
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
                {type === "order" && (
                  <>
                    <div className="col-span-2">
                      <Input className="h-9 text-xs" type="number" placeholder="PU" value={line.unit_price} onChange={(e) => updateLine(idx, "unit_price", Number(e.target.value))} />
                    </div>
                    <div className="col-span-1">
                      <Input className="h-9 text-xs" type="number" placeholder="TVA%" value={line.tva_rate} onChange={(e) => updateLine(idx, "tva_rate", Number(e.target.value))} />
                    </div>
                  </>
                )}
                <div className="col-span-1">
                  <Button size="sm" variant="ghost" onClick={() => removeLine(idx)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                </div>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={addLine}><Plus className="h-3 w-3 mr-1" /> Ligne</Button>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            {type === "order" && (
              <div className="space-y-1 text-sm">
                <p>Total HT: <strong>{subtotal_ht.toLocaleString("fr-MA")} MAD</strong></p>
                <p>TVA: <strong>{total_tva.toLocaleString("fr-MA")} MAD</strong></p>
                <p className="text-lg font-bold">TTC: {total_ttc.toLocaleString("fr-MA")} MAD</p>
              </div>
            )}
            <div className="space-x-2 ml-auto">
              <Button variant="outline" onClick={onClose}>Annuler</Button>
              <Button onClick={handleSubmit} disabled={submitting}>Enregistrer</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
