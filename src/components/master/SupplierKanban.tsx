import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Phone, CreditCard, Clock, AlertCircle, Ban } from "lucide-react";

interface SupplierKanbanProps {
  suppliers: any[];
  stats: Record<string, { totalPurchases?: number; outstandingDebt?: number }>;
  onView: (supplier: any) => void;
  onNewPO?: (supplier: any) => void;
}

const TERMS_MAP: Record<string, string> = { "30j": "30 jours", "60j": "60 jours", "90j": "90 jours", comptant: "Comptant" };

export function SupplierKanban({ suppliers, stats, onView }: SupplierKanbanProps) {
  const fmt = (n: number) => n.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (suppliers.length === 0) {
    return <p className="text-center text-muted-foreground py-16">Aucun fournisseur trouvé.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {suppliers.map((s) => {
        const st = stats[s.id];
        const debt = st?.outstandingDebt ?? 0;
        const limit = Number(s.credit_limit || 0);
        const overLimit = limit > 0 && debt > limit;

        return (
          <div
            key={s.id}
            className={`bg-card rounded-xl border p-5 cursor-pointer group transition-all duration-300 ease-in-out hover:-translate-y-[3px] hover:scale-[1.01] hover:shadow-[0_8px_30px_-8px_hsl(195,78%,53%,0.12)] ${
              debt > 0 ? "border-destructive/40 hover:border-destructive/60" : "border-border hover:border-[hsl(195,78%,53%)]/30"
            }`}
            onClick={() => onView(s)}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-foreground text-sm leading-tight truncate flex-1 mr-2">
                {s.name}
              </h3>
              <div className="flex gap-1 flex-shrink-0">
                {s.is_active === false && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 font-medium">
                    <Ban className="h-2.5 w-2.5 mr-0.5" />
                    Bloqué
                  </Badge>
                )}
                {debt > 0 && (
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
              {s.ice && (
                <div className="flex items-center gap-1.5">
                  <CreditCard className="h-3 w-3 flex-shrink-0 opacity-60" />
                  <span className="truncate">ICE: {s.ice}</span>
                </div>
              )}
              {s.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3 w-3 flex-shrink-0 opacity-60" />
                  <span>{s.phone}</span>
                </div>
              )}
              {s.payment_terms && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3 flex-shrink-0 opacity-60" />
                  <span>{TERMS_MAP[s.payment_terms] ?? s.payment_terms}</span>
                </div>
              )}
              <div className="pt-1 border-t border-border/50">
                <span className="text-muted-foreground">Dettes : </span>
                <span className={`font-semibold ${debt > 0 ? "text-destructive" : "text-foreground"}`}>
                  {fmt(debt)} MAD
                </span>
              </div>
            </div>

            {/* Single action */}
            <div onClick={(e) => e.stopPropagation()}>
              <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5 font-medium" onClick={() => onView(s)}>
                <Eye className="h-3.5 w-3.5" /> Voir fiche
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
