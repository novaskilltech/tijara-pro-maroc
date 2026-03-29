import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  item: any; // purchase request
  onClose: () => void;
  onSaved: () => void;
}

interface SupplierLine {
  id: string;
  product_name: string;
  product_code: string;
  quantity: number;
  unit: string;
  supplier_unit_price: number;
  supplier_discount_percent: number;
  supplier_tva_rate: number;
  supplier_line_total: number;
}

export function SupplierResponseDialog({ item, onClose, onSaved }: Props) {
  const [supplierReference, setSupplierReference] = useState(item.supplier_reference || "");
  const [supplierResponseDate, setSupplierResponseDate] = useState(item.supplier_response_date || new Date().toISOString().split("T")[0]);
  const [supplierNotes, setSupplierNotes] = useState(item.supplier_notes || "");
  const [lines, setLines] = useState<SupplierLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (supabase as any).from("purchase_request_lines")
      .select("*, product:products(name, code)")
      .eq("request_id", item.id)
      .order("sort_order")
      .then(({ data }: any) => {
        setLines((data || []).map((l: any) => ({
          id: l.id,
          product_name: l.product?.name || l.description || "—",
          product_code: l.product?.code || "",
          quantity: Number(l.quantity) || 0,
          unit: l.unit || "Unité",
          supplier_unit_price: Number(l.supplier_unit_price) || 0,
          supplier_discount_percent: Number(l.supplier_discount_percent) || 0,
          supplier_tva_rate: l.supplier_tva_rate != null ? Number(l.supplier_tva_rate) : (Number(l.tva_rate) || 20),
          supplier_line_total: Number(l.supplier_line_total) || 0,
        })));
        setLoading(false);
      });
  }, [item.id]);

  const calcLineTotal = (l: SupplierLine) => {
    const ht = l.quantity * l.supplier_unit_price * (1 - (l.supplier_discount_percent || 0) / 100);
    const tva = ht * (l.supplier_tva_rate || 0) / 100;
    return Math.round((ht + tva) * 100) / 100;
  };

  const calcLineHT = (l: SupplierLine) => {
    return l.quantity * l.supplier_unit_price * (1 - (l.supplier_discount_percent || 0) / 100);
  };

  const updateLine = (idx: number, field: keyof SupplierLine, value: number) => {
    const updated = [...lines];
    (updated[idx] as any)[field] = value;
    updated[idx].supplier_line_total = calcLineTotal(updated[idx]);
    setLines(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Calculate totals from supplier prices
      let totalHtCalc = 0, totalTvaCalc = 0, totalTtcCalc = 0;
      for (const l of lines) {
        const ht = calcLineHT(l);
        const tvaAmt = ht * (l.supplier_tva_rate || 0) / 100;
        totalHtCalc += ht;
        totalTvaCalc += tvaAmt;
        totalTtcCalc += ht + tvaAmt;
      }

      // Update header with supplier response AND recalculated totals
      const { error: hErr } = await (supabase as any).from("purchase_requests").update({
        supplier_reference: supplierReference || null,
        supplier_response_date: supplierResponseDate || null,
        supplier_notes: supplierNotes || null,
        total_ht: Math.round(totalHtCalc * 100) / 100,
        total_tva: Math.round(totalTvaCalc * 100) / 100,
        total_ttc: Math.round(totalTtcCalc * 100) / 100,
      }).eq("id", item.id);
      if (hErr) throw hErr;

      // Update each line
      for (const l of lines) {
        const ht = calcLineHT(l);
        const { error: lErr } = await (supabase as any).from("purchase_request_lines").update({
          supplier_unit_price: l.supplier_unit_price,
          supplier_discount_percent: l.supplier_discount_percent,
          supplier_tva_rate: l.supplier_tva_rate,
          supplier_line_total: Math.round(ht * 100) / 100,
        }).eq("id", l.id);
        if (lErr) throw lErr;
      }

      toast({ title: "Réponse fournisseur enregistrée" });
      onSaved();
      onClose();
    } catch (err: any) {
      toast({ title: "Erreur", description: err?.message || "Erreur inattendue", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const totalHT = lines.reduce((s, l) => s + calcLineHT(l), 0);
  const totalTVA = lines.reduce((s, l) => {
    const ht = calcLineHT(l);
    return s + ht * (l.supplier_tva_rate || 0) / 100;
  }, 0);
  const totalTTC = totalHT + totalTVA;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Réponse Fournisseur — {item.number || item.request_number}</DialogTitle>
          <DialogDescription>Saisissez les prix et conditions du fournisseur</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Référence fournisseur (N° de devis)</Label>
              <Input value={supplierReference} onChange={e => setSupplierReference(e.target.value)} placeholder="Réf. devis fournisseur..." />
            </div>
            <div>
              <Label>Date réponse fournisseur</Label>
              <Input type="date" value={supplierResponseDate} onChange={e => setSupplierResponseDate(e.target.value)} />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Prix Fournisseur par Ligne</Label>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Produit</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground w-[70px]">Qté</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground w-[70px]">UdM</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground w-[120px]">Prix unit. fournisseur</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground w-[90px]">Remise %</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground w-[80px]">TVA %</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground w-[110px]">Total HT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => {
                      const lineHT = calcLineHT(line);
                      return (
                        <tr key={line.id} className="border-b border-border/50 last:border-b-0">
                          <td className="px-3 py-2">
                            <div className="font-medium">{line.product_name}</div>
                            {line.product_code && <div className="text-xs text-muted-foreground font-mono">{line.product_code}</div>}
                          </td>
                          <td className="px-3 py-2 text-right">{line.quantity}</td>
                          <td className="px-3 py-2">{line.unit}</td>
                          <td className="px-3 py-2">
                            <Input className="h-8 text-xs" type="number" min={0} step="0.01" value={line.supplier_unit_price || ""} onChange={e => updateLine(idx, "supplier_unit_price", Number(e.target.value))} />
                          </td>
                          <td className="px-3 py-2">
                            <Input className="h-8 text-xs" type="number" min={0} max={100} value={line.supplier_discount_percent || ""} onChange={e => updateLine(idx, "supplier_discount_percent", Number(e.target.value))} />
                          </td>
                          <td className="px-3 py-2">
                            <Input className="h-8 text-xs" type="number" min={0} value={line.supplier_tva_rate ?? ""} onChange={e => updateLine(idx, "supplier_tva_rate", Number(e.target.value))} />
                          </td>
                          <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                            {lineHT.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-2 max-w-xs ml-auto">
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
            </div>
          )}

          <div>
            <Label>Notes fournisseur</Label>
            <Textarea value={supplierNotes} onChange={e => setSupplierNotes(e.target.value)} rows={2} placeholder="Conditions, remarques du fournisseur..." />
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
