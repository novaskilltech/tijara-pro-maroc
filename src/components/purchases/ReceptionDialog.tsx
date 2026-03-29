import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useCompany } from "@/hooks/useCompany";

interface Allocation {
  warehouse_id: string;
  quantity: number;
}

interface Props { order: any; hook: any; stock: any; onClose: () => void; }

export function ReceptionDialog({ order, hook, stock, onClose }: Props) {
  const [lines, setLines] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<Record<string, Allocation[]>>({});
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? null;

  // Fetch warehouses + PO lines
  useEffect(() => {
    const load = async () => {
      const [linesRes, whRes] = await Promise.all([
        hook.getLines(order.id),
        (supabase as any).from("warehouses").select("id, name, code").eq("company_id", companyId).eq("is_active", true).order("name"),
      ]);
      const l = linesRes as any[];
      setLines(l);
      setWarehouses(whRes.data || []);

      // Initialize allocations: one row per line with remaining qty, default warehouse from PO
      const defaultWh = order.warehouse_id || "";
      const allocs: Record<string, Allocation[]> = {};
      l.forEach((line: any) => {
        const remaining = Math.max(0, Number(line.quantity) - Number(line.received_qty || 0));
        allocs[line.id] = [{ warehouse_id: defaultWh, quantity: remaining }];
      });
      setAllocations(allocs);
      setLoading(false);
    };
    load();
  }, [order.id, companyId]);

  const warehouseOptions = warehouses.map(w => ({ value: w.id, label: w.name, sub: w.code }));

  const updateAllocation = (lineId: string, allocIdx: number, field: keyof Allocation, value: any) => {
    setAllocations(prev => {
      const next = { ...prev };
      const arr = [...(next[lineId] || [])];
      arr[allocIdx] = { ...arr[allocIdx], [field]: value };
      next[lineId] = arr;
      return next;
    });
  };

  const addAllocation = (lineId: string) => {
    setAllocations(prev => {
      const next = { ...prev };
      next[lineId] = [...(next[lineId] || []), { warehouse_id: "", quantity: 0 }];
      return next;
    });
  };

  const removeAllocation = (lineId: string, allocIdx: number) => {
    setAllocations(prev => {
      const next = { ...prev };
      next[lineId] = (next[lineId] || []).filter((_, i) => i !== allocIdx);
      return next;
    });
  };

  const handleValidate = async () => {
    // Validate allocations
    for (const l of lines) {
      const remaining = Math.max(0, Number(l.quantity) - Number(l.received_qty || 0));
      const lineAllocs = allocations[l.id] || [];
      const totalAllocated = lineAllocs.reduce((s, a) => s + (a.quantity || 0), 0);

      if (totalAllocated <= 0) continue; // skip lines with 0

      for (const alloc of lineAllocs) {
        if (alloc.quantity > 0 && !alloc.warehouse_id) {
          toast({ title: "Veuillez sélectionner un dépôt.", variant: "destructive" });
          return;
        }
      }

      if (totalAllocated > remaining) {
        toast({ title: "La quantité totale reçue dépasse la quantité restante.", variant: "destructive" });
        return;
      }

      // Check duplicate warehouses - merge them
      const whMap = new Map<string, number>();
      for (const alloc of lineAllocs) {
        if (alloc.quantity > 0 && alloc.warehouse_id) {
          whMap.set(alloc.warehouse_id, (whMap.get(alloc.warehouse_id) || 0) + alloc.quantity);
        }
      }
      // Replace with merged
      const merged = Array.from(whMap.entries()).map(([wh, qty]) => ({ warehouse_id: wh, quantity: qty }));
      allocations[l.id] = merged;
    }

    // Build reception lines with allocations
    const toReceive = lines
      .filter(l => {
        const lineAllocs = allocations[l.id] || [];
        return lineAllocs.some(a => a.quantity > 0);
      })
      .map(l => {
        const lineAllocs = (allocations[l.id] || []).filter(a => a.quantity > 0 && a.warehouse_id);
        const totalQty = lineAllocs.reduce((s, a) => s + a.quantity, 0);
        return {
          purchase_order_line_id: l.id,
          product_id: l.product_id,
          description: l.description,
          quantity: totalQty,
          unit_price: Number(l.unit_price),
          discount_percent: Number(l.discount_percent || 0),
          tva_rate: Number(l.tva_rate),
          allocations: lineAllocs,
        };
      });

    if (toReceive.length === 0) {
      toast({ title: "La quantité reçue doit être supérieure à zéro.", variant: "destructive" });
      return;
    }

    setSaving(true);
    await hook.createReception(order.id, toReceive, stock.addStock);
    await stock.fetchAll();
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Réception — {order.number}</DialogTitle></DialogHeader>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Indiquez les quantités effectivement reçues et le dépôt de destination :</p>
            {lines.map(l => {
              const remaining = Math.max(0, Number(l.quantity) - Number(l.received_qty || 0));
              const lineAllocs = allocations[l.id] || [];
              const totalAllocated = lineAllocs.reduce((s, a) => s + (a.quantity || 0), 0);
              const isOver = totalAllocated > remaining;

              return (
                <div key={l.id} className="bg-muted/30 rounded-lg p-3 space-y-3">
                  {/* Product info */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm flex-1">
                      {l.product?.code && <span className="font-mono text-xs text-muted-foreground mr-2">{l.product.code}</span>}
                      {l.description}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      Cmd: {l.quantity} | Reçu: {l.received_qty || 0} | Restant: {remaining}
                    </span>
                  </div>

                  {/* Warehouse allocations */}
                  <div className="ml-4 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Répartition par dépôt :</p>
                    {lineAllocs.map((alloc, ai) => (
                      <div key={ai} className="flex items-center gap-2">
                        <div className="w-48">
                          <SearchableSelect
                            options={warehouseOptions}
                            value={alloc.warehouse_id}
                            onValueChange={v => updateAllocation(l.id, ai, "warehouse_id", v)}
                            placeholder="Sélectionner dépôt…"
                          />
                        </div>
                        <Input
                          type="number"
                          className="w-24 h-8 text-sm"
                          min={0}
                          max={remaining}
                          value={alloc.quantity}
                          onChange={e => updateAllocation(l.id, ai, "quantity", Math.max(0, Number(e.target.value)))}
                        />
                        {lineAllocs.length > 1 && (
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeAllocation(l.id, ai)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button variant="ghost" size="sm" className="text-xs text-primary gap-1 h-7"
                      onClick={() => addAllocation(l.id)}>
                      <Plus className="h-3 w-3" /> Ajouter un dépôt
                    </Button>
                    {isOver && (
                      <p className="text-xs text-destructive">La quantité totale reçue dépasse la quantité restante.</p>
                    )}
                    {totalAllocated > 0 && !isOver && (
                      <p className="text-xs text-muted-foreground">
                        Total réparti : {totalAllocated} / {remaining}
                        {totalAllocated < remaining && " (réception partielle)"}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleValidate} disabled={saving || loading}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Valider la réception
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
