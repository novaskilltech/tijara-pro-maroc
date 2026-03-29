import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useStockEngine } from "@/hooks/useStockEngine";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const NiveauxStock = () => {
  const { stockLevels, loading } = useStockEngine();
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [filterWarehouse, setFilterWarehouse] = useState("all");

  useEffect(() => {
    (supabase as any).from("warehouses").select("id, name, code").eq("is_active", true).then(({ data }: any) => setWarehouses(data || []));
  }, []);

  const filteredLevels = filterWarehouse === "all" ? stockLevels : stockLevels.filter(sl => sl.warehouse_id === filterWarehouse);
  const stockValue = filteredLevels.reduce((s, sl) => s + sl.stock_on_hand * sl.cmup, 0);

  return (
    <AppLayout title="Niveaux de stock" subtitle="Vue d'ensemble des stocks par dépôt">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Select value={filterWarehouse} onValueChange={setFilterWarehouse}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Tous les dépôts" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les dépôts</SelectItem>
              {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Card className="px-4 py-2">
            <p className="text-xs text-muted-foreground">Valeur du stock</p>
            <p className="text-lg font-bold text-primary">{stockValue.toLocaleString("fr-MA")} MAD</p>
          </Card>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filteredLevels.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Aucun stock enregistré</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>Dépôt</TableHead>
                  <TableHead className="text-right">En main</TableHead>
                  <TableHead className="text-right">Réservé</TableHead>
                  <TableHead className="text-right">Disponible</TableHead>
                  <TableHead className="text-right">CMUP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLevels.map(sl => (
                  <TableRow key={sl.id}>
                    <TableCell>{sl.product?.code} — {sl.product?.name}</TableCell>
                    <TableCell>{sl.warehouse?.name}</TableCell>
                    <TableCell className="text-right">{sl.stock_on_hand}</TableCell>
                    <TableCell className="text-right">{sl.stock_reserved}</TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={sl.stock_available <= 0 ? "text-destructive" : "text-green-600"}>{sl.stock_available}</span>
                    </TableCell>
                    <TableCell className="text-right">{Number(sl.cmup).toLocaleString("fr-MA")} MAD</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default NiveauxStock;
