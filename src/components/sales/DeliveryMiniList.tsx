import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Truck, ChevronRight, Eye } from "lucide-react";
import { DELIVERY_STATUS_LABELS, DELIVERY_STATUS_COLORS } from "@/hooks/useSales";

interface Props {
  deliveries: any;
  stock: any;
  onNavigate?: () => void;
}

export function DeliveryMiniList({ deliveries, stock, onNavigate }: Props) {
  if (deliveries.loading) {
    return <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin" /></div>;
  }

  if (deliveries.items.length === 0) return null;

  return (
    <div className="bg-card border rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Truck className="h-4 w-4 text-muted-foreground" /> Bons de livraison liés
        </h3>
        {onNavigate && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onNavigate}>
            Voir tout <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {deliveries.items.map((d: any) => (
          <div key={d.id} className="flex items-center justify-between text-sm bg-muted/30 rounded-lg px-3 py-2">
            <span className="font-mono text-xs font-medium">{d.delivery_number}</span>
            <span className="text-xs text-muted-foreground">{d.delivery_date}</span>
            <Badge className={`${DELIVERY_STATUS_COLORS[d.status] || ""} border text-xs`}>
              {DELIVERY_STATUS_LABELS[d.status] || d.status}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
