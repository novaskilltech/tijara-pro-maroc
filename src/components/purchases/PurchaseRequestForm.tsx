import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { PurchaseLine } from "@/hooks/usePurchases";

interface Props {
  editItem: any | null;
  hook: any;
  onClose: () => void;
}

const emptyLine = (): Partial<PurchaseLine> => ({
  product_id: null, description: "", quantity: 1, unit: "Unité", estimated_cost: 0, tva_rate: 0,
});

export function PurchaseRequestForm({ editItem, hook, onClose }: Props) {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? null;
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState(editItem?.supplier_id || "");
  const [neededDate, setNeededDate] = useState(editItem?.needed_date || "");
  const [supplierReference, setSupplierReference] = useState(editItem?.supplier_reference || "");
  const [currencyId, setCurrencyId] = useState(editItem?.currency_id || "");
  const [notes, setNotes] = useState(editItem?.notes || "");
  const [lines, setLines] = useState<Partial<PurchaseLine>[]>(editItem ? [] : [emptyLine()]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [supplierError, setSupplierError] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    (supabase as any).from("suppliers").select("id, name, code").eq("is_active", true).eq("company_id", companyId).order("name").then(({ data }: any) => setSuppliers(data || []));
    (supabase as any).from("currencies").select("id, code, symbol, name").eq("is_active", true).order("sort_order").then(({ data }: any) => {
      setCurrencies(data || []);
      if (!editItem && data?.length) {
        const mad = data.find((c: any) => c.code === "MAD");
        if (mad) setCurrencyId(mad.id);
        else setCurrencyId(data[0].id);
      }
    });
    (supabase as any).from("products").select("id, name, code, tva_rate").eq("is_active", true).eq("company_id", companyId).order("name").then(({ data }: any) => setProducts(data || []));

    if (editItem) {
      setLoading(true);
      hook.getLines(editItem.id).then((l: any[]) => {
        setLines(l.map(r => ({ product_id: r.product_id, description: r.description, quantity: r.quantity, unit: r.unit || "Unité", estimated_cost: r.estimated_cost || 0, tva_rate: r.tva_rate })));
        setLoading(false);
      });
    }
  }, [companyId]);

  const updateLine = (idx: number, field: string, value: any) => {
    const updated = [...lines];
    (updated[idx] as any)[field] = value;
    if (field === "product_id") {
      const p = products.find((pr: any) => pr.id === value);
      if (p) {
        updated[idx].description = p.name;
        // Do NOT auto-fill price - user must enter manually
      }
    }
    setLines(updated);
  };

  const getProductCode = (productId: string | null | undefined) => {
    if (!productId) return null;
    const p = products.find((pr: any) => pr.id === productId);
    return p?.code || null;
  };

  const handleSave = async () => {
    if (!supplierId) {
      setSupplierError(true);
      toast({ title: "Champ obligatoire", description: "Fournisseur obligatoire", variant: "destructive" });
      return;
    }
    setSupplierError(false);

    setSaving(true);
    try {
      if (editItem) {
        const result = await hook.update(editItem.id, {
          supplier_id: supplierId,
          needed_date: neededDate || null,
          supplier_reference: supplierReference || null,
          currency_id: currencyId || null,
          notes,
        }, lines);
        if (result === false) {
          console.error("Échec de la mise à jour de la demande d'achat");
          setSaving(false);
          return;
        }
        toast({ title: "Demande d'achat mise à jour" });
      } else {
        const result = await hook.create({
          supplierId,
          neededDate: neededDate || undefined,
          supplierReference: supplierReference || undefined,
          currencyId: currencyId || undefined,
          notes,
          lines,
        });
        if (!result) {
          console.error("Échec de la création de la demande d'achat");
          setSaving(false);
          return;
        }
      }
      onClose();
    } catch (err: any) {
      console.error("Erreur sauvegarde demande d'achat:", err);
      toast({ title: "Erreur", description: err?.message || "Erreur inattendue lors de la sauvegarde", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const supplierOptions = suppliers.map(s => ({ value: s.id, label: `${s.code} — ${s.name}` }));
  const productOptions = products.map(p => ({ value: p.id, label: `${p.code} — ${p.name}` }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editItem ? `Modifier DA — ${editItem.number}` : "Nouvelle demande d'achat"}</DialogTitle>
          <DialogDescription>Remplissez les informations de la demande d'achat</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className={supplierError ? "text-destructive" : ""}>
                Fournisseur <span className="text-destructive">*</span>
              </Label>
              <SearchableSelect
                options={supplierOptions}
                value={supplierId}
                onValueChange={(v) => { setSupplierId(v); setSupplierError(false); }}
                placeholder="Sélectionner un fournisseur..."
              />
              {supplierError && (
                <p className="text-sm text-destructive mt-1">Fournisseur obligatoire</p>
              )}
            </div>
            <div>
              <Label>Référence fournisseur (N° de devis)</Label>
              <Input placeholder="Réf. devis fournisseur..." value={supplierReference} onChange={e => setSupplierReference(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Arrivée prévue</Label>
              <Input type="date" value={neededDate} onChange={e => setNeededDate(e.target.value)} />
            </div>
            <div>
              <Label>Devise</Label>
              <Select value={currencyId} onValueChange={setCurrencyId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner une devise" /></SelectTrigger>
                <SelectContent>
                  {currencies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.code} — {c.name || c.symbol}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Liste des Produits</Label>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Produit</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground w-[90px]">Quantité</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground w-[100px]">UdM</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground w-[110px]">Prix unitaire</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground w-[80px]">TVA %</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground w-[100px]">Hors taxes</th>
                      <th className="w-[40px]" />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => {
                      const lineHT = (Number(line.quantity) || 0) * (Number(line.estimated_cost) || 0);
                      return (
                        <tr key={idx} className="border-b border-border/50 last:border-b-0">
                          <td className="px-3 py-2">
                            <SearchableSelect options={productOptions} value={line.product_id || ""} onValueChange={v => updateLine(idx, "product_id", v)} placeholder="Produit..." className="min-w-[160px]" />
                          </td>
                          <td className="px-3 py-2">
                            <Input className="h-8 text-xs" type="number" min={0} value={line.quantity || ""} onChange={e => updateLine(idx, "quantity", Number(e.target.value))} />
                          </td>
                          <td className="px-3 py-2">
                            <Select value={line.unit || "Unité"} onValueChange={v => updateLine(idx, "unit", v)}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {["Unité", "Kg", "L", "m", "m²", "Boîte", "Carton", "Pièce"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2">
                            <Input className="h-8 text-xs" type="number" min={0} placeholder="0,00" value={line.estimated_cost || ""} onChange={e => updateLine(idx, "estimated_cost", Number(e.target.value))} />
                          </td>
                          <td className="px-3 py-2">
                            <Input className="h-8 text-xs" type="number" min={0} value={line.tva_rate || ""} onChange={e => updateLine(idx, "tva_rate", Number(e.target.value))} />
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-sm whitespace-nowrap">
                            {lineHT.toFixed(2)}
                          </td>
                          <td className="px-1 py-2">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setLines(lines.filter((_, i) => i !== idx))}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <Button size="sm" variant="outline" onClick={() => setLines([...lines, emptyLine()])}>
                <Plus className="h-3 w-3 mr-1" /> Ajouter une ligne
              </Button>

              {/* Totals summary */}
              {lines.length > 0 && (() => {
                const totalHT = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.estimated_cost) || 0), 0);
                const totalTVA = lines.reduce((sum, l) => {
                  const ht = (Number(l.quantity) || 0) * (Number(l.estimated_cost) || 0);
                  return sum + ht * (Number(l.tva_rate) || 0) / 100;
                }, 0);
                const totalTTC = totalHT + totalTVA;
                return (
                  <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total HT</span>
                      <span className="font-medium">{totalHT.toFixed(2)} MAD</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total TVA</span>
                      <span className="font-medium">{totalTVA.toFixed(2)} MAD</span>
                    </div>
                    <div className="flex justify-between text-base font-semibold border-t border-border pt-2">
                      <span>Total TTC</span>
                      <span>{totalTTC.toFixed(2)} MAD</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <div>
            <Label>Notes internes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
