import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Warehouse } from "lucide-react";

interface InventoryTabProps {
  productId: string | null;
}

interface StockLevel {
  id: string;
  warehouse_id: string;
  warehouse_name: string;
  stock_on_hand: number;
  stock_reserved: number;
  cmup: number;
}

export function InventoryTab({ productId }: InventoryTabProps) {
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    (async () => {
      const { data } = await (supabase as any)
        .from("stock_levels")
        .select("*, warehouses(name)")
        .eq("product_id", productId);
      const levels: StockLevel[] = (data || []).map((sl: any) => ({
        id: sl.id,
        warehouse_id: sl.warehouse_id,
        warehouse_name: sl.warehouses?.name || "—",
        stock_on_hand: sl.stock_on_hand,
        stock_reserved: sl.stock_reserved,
        cmup: sl.cmup,
      }));
      setStockLevels(levels);
      setLoading(false);
    })();
  }, [productId]);

  if (!productId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Enregistrez d'abord le produit pour voir l'inventaire.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (stockLevels.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Warehouse className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="font-medium">Aucun stock enregistré</p>
        <p className="text-sm mt-1">Les niveaux de stock apparaîtront après les premières réceptions.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Dépôt</TableHead>
            <TableHead className="text-right">Stock en main</TableHead>
            <TableHead className="text-right">Stock réservé</TableHead>
            <TableHead className="text-right">Disponible</TableHead>
            <TableHead className="text-right">CMUP (MAD)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stockLevels.map((sl) => {
            const available = sl.stock_on_hand - sl.stock_reserved;
            return (
              <TableRow key={sl.id}>
                <TableCell className="font-medium">{sl.warehouse_name}</TableCell>
                <TableCell className="text-right">{sl.stock_on_hand}</TableCell>
                <TableCell className="text-right">{sl.stock_reserved}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={available > 0 ? "default" : "destructive"} className="text-xs">
                    {available}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{sl.cmup.toLocaleString("fr-MA")}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
