import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Package } from "lucide-react";
import type { Product } from "@/hooks/useProducts";

interface ProductKanbanProps {
  products: Product[];
  stockLevels?: Record<string, { on_hand: number; reserved: number; available: number }>;
  onView: (product: Product) => void;
  onEdit: (product: Product) => void;
}

export function ProductKanban({ products, stockLevels, onView }: ProductKanbanProps) {
  const fmt = (n: number) => n.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getStockBadge = (p: Product) => {
    const sl = stockLevels?.[p.id];
    if (!sl || p.product_type === "service") return null;
    const available = sl.available;
    const minStock = p.min_stock || 0;
    if (available <= 0)
      return <Badge className="text-[10px] px-1.5 py-0 h-4 bg-destructive/10 text-destructive border-destructive/20 font-medium">Rupture</Badge>;
    if (available <= minStock)
      return <Badge className="text-[10px] px-1.5 py-0 h-4 bg-warning/10 text-warning-foreground border-warning/20 font-medium">Stock faible</Badge>;
    return <Badge className="text-[10px] px-1.5 py-0 h-4 bg-success/10 text-success border-success/20 font-medium">En stock</Badge>;
  };

  if (products.length === 0) {
    return <p className="text-center text-muted-foreground py-16">Aucun produit trouvé.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.map((p) => {
        const sl = stockLevels?.[p.id];
        const available = sl?.available ?? 0;

        return (
          <div
            key={p.id}
            className="bg-card rounded-xl border border-border p-5 cursor-pointer group transition-all duration-[250ms] ease-in-out hover:-translate-y-[3px] hover:scale-[1.01] hover:shadow-[0_8px_30px_-8px_hsl(195,78%,53%,0.12)] hover:border-[hsl(195,78%,53%)]/30"
            onClick={() => onView(p)}
          >
            {/* Image + Name */}
            <div className="flex items-start gap-3 mb-3">
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="w-12 h-12 rounded-lg object-cover border border-border flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-sm leading-tight truncate">{p.name}</h3>
                <span className="font-mono text-[11px] text-muted-foreground">{p.code}</span>
                <div className="mt-1">{getStockBadge(p)}</div>
              </div>
            </div>

            {/* Body */}
            <div className="space-y-1 text-xs text-muted-foreground mb-4">
              <div className="flex justify-between">
                <span>Catégorie</span>
                <span className="font-medium text-foreground truncate ml-2">{p.category || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span>Prix vente</span>
                <span className="font-semibold text-foreground">{fmt(p.sale_price)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-border/50">
                <span>Stock dispo</span>
                <span className={`font-semibold ${available <= 0 ? "text-destructive" : available <= (p.min_stock || 0) ? "text-warning" : "text-foreground"}`}>
                  {p.product_type === "service" ? "—" : available}
                </span>
              </div>
            </div>

            {/* Single action */}
            <div onClick={(e) => e.stopPropagation()}>
              <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5 font-medium" onClick={() => onView(p)}>
                <Eye className="h-3.5 w-3.5" /> Voir fiche
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
