import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Phone, MapPin, CreditCard, AlertCircle, Ban } from "lucide-react";

interface CustomerKanbanProps {
  customers: any[];
  stats: Record<string, { totalSales?: number; totalPurchases?: number; outstandingDebt?: number; outstandingReceivable?: number }>;
  onView: (customer: any) => void;
  onNewInvoice?: (customer: any) => void;
}

export function CustomerKanban({ customers, stats, onView }: CustomerKanbanProps) {
  const fmt = (n: number) => n.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getAccent = (customer: any) => {
    const s = stats[customer.id];
    const unpaid = s?.outstandingReceivable ?? 0;
    const limit = Number(customer.credit_limit || 0);
    if (unpaid > 0) return "border-destructive/40 hover:border-destructive/60";
    if (limit > 0 && unpaid >= limit) return "border-warning/40 hover:border-warning/60";
    return "border-border hover:border-[hsl(195,78%,53%)]/30";
  };

  if (customers.length === 0) {
    return <p className="text-center text-muted-foreground py-16">Aucun client trouvé.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {customers.map((c) => {
        const s = stats[c.id];
        const unpaid = s?.outstandingReceivable ?? 0;
        const limit = Number(c.credit_limit || 0);
        const overLimit = limit > 0 && unpaid > limit;

        return (
          <div
            key={c.id}
            className={`rounded-xl border p-5 cursor-pointer group transition-all duration-300 ease-in-out hover:-translate-y-[3px] hover:scale-[1.01] hover:shadow-[0_8px_30px_-8px_hsl(195,78%,53%,0.18)] bg-gradient-to-br from-card via-card to-accent/20 backdrop-blur-sm ${getAccent(c)}`}
            onClick={() => onView(c)}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-foreground text-sm leading-tight truncate flex-1 mr-2">
                {c.name}
              </h3>
              <div className="flex gap-1 flex-shrink-0">
                {c.is_active === false && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 font-medium">
                    <Ban className="h-2.5 w-2.5 mr-0.5" />
                    Bloqué
                  </Badge>
                )}
                {unpaid > 0 && (
                  <Badge className="text-[10px] px-1.5 py-0 h-4 bg-destructive/10 text-destructive border-destructive/20 font-medium">
                    Impayé
                  </Badge>
                )}
                {overLimit && (
                  <Badge className="text-[10px] px-1.5 py-0 h-4 bg-warning/10 text-warning-foreground border-warning/20 font-medium">
                    <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                    Dépassé
                  </Badge>
                )}
              </div>
            </div>

            {/* Body — max 4 lines */}
            <div className="space-y-1.5 text-xs text-muted-foreground mb-4">
              {c.ice && (
                <div className="flex items-center gap-1.5">
                  <CreditCard className="h-3 w-3 flex-shrink-0 opacity-60" />
                  <span className="truncate">ICE: {c.ice}</span>
                </div>
              )}
              {c.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3 w-3 flex-shrink-0 opacity-60" />
                  <span>{c.phone}</span>
                </div>
              )}
              {c.city && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 flex-shrink-0 opacity-60" />
                  <span>{c.city}</span>
                </div>
              )}
              <div className="pt-1 border-t border-border/50">
                <span className="text-muted-foreground">Impayés : </span>
                <span className={`font-semibold ${unpaid > 0 ? "text-destructive" : "text-foreground"}`}>
                  {fmt(unpaid)} MAD
                </span>
              </div>
            </div>

            {/* Single action */}
            <div onClick={(e) => e.stopPropagation()}>
              <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5 font-medium" onClick={() => onView(c)}>
                <Eye className="h-3.5 w-3.5" /> Voir fiche
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
