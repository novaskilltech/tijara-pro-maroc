import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Lightbulb, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2,
  Package,
  ArrowRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Insight {
  type: "success" | "warning" | "info" | "error";
  title: string;
  message: string;
  action?: string;
  icon: any;
}

interface DashboardInsightsProps {
  kpi: {
    revenue: number;
    grossMargin: number;
    cashPosition: number;
    customerUnpaid: number;
  };
  stockAlertsCount: number;
  revenueGrowth?: number; // percentage
}

export function DashboardInsights({ kpi, stockAlertsCount, revenueGrowth = 0 }: DashboardInsightsProps) {
  const insights: Insight[] = [];

  // 1. Revenue Growth Insight
  if (revenueGrowth > 5) {
    insights.push({
      type: "success",
      title: "Croissance boostée",
      message: `Votre CA a augmenté de ${revenueGrowth}% ce mois-ci. Excellent travail !`,
      icon: TrendingUp,
    });
  } else if (revenueGrowth < -5) {
    insights.push({
      type: "warning",
      title: "Baisse d'activité",
      message: "Le CA est en recul. Envisagez une promotion sur vos stocks dormants.",
      icon: TrendingDown,
      action: "Voir Stock"
    });
  }

  // 2. Stock Alerts Insight
  if (stockAlertsCount > 0) {
    insights.push({
      type: "error",
      title: "Risque de rupture",
      message: `${stockAlertsCount} produits sont en dessous du seuil minimal.`,
      icon: Package,
      action: "Réapprovisionner"
    });
  }

  // 3. Cashflow / Unpaid Insight
  if (kpi.customerUnpaid > kpi.revenue * 0.3) {
    insights.push({
      type: "warning",
      title: "Trésorerie à surveiller",
      message: "Le volume des impayés clients dépasse 30% de votre CA.",
      icon: AlertTriangle,
      action: "Relancer"
    });
  }

  // Default encouraging insight if empty
  if (insights.length === 0) {
    insights.push({
      type: "info",
      title: "Tout est sous contrôle",
      message: "Aucune anomalie détectée dans vos opérations aujourd'hui.",
      icon: CheckCircle2,
    });
  }

  return (
    <Card className="border border-primary/20 bg-primary/5 shadow-none overflow-hidden h-full">
      <CardHeader className="pb-2 flex flex-row items-center gap-2">
        <Lightbulb className="h-5 w-5 text-primary" />
        <CardTitle className="text-base font-bold">Insights IA & Conseils</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.map((insight, idx) => (
          <div key={idx} className="flex gap-3 group">
            <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 
              ${insight.type === 'success' ? 'bg-green-100 text-green-600' : ''}
              ${insight.type === 'warning' ? 'bg-amber-100 text-amber-600' : ''}
              ${insight.type === 'error' ? 'bg-red-100 text-red-600' : ''}
              ${insight.type === 'info' ? 'bg-blue-100 text-blue-600' : ''}
            `}>
              <insight.icon className="h-4 w-4" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{insight.title}</p>
                {insight.action && (
                  <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-primary px-2 py-0 border-primary/30 hover:bg-primary/5">
                    {insight.action} <ArrowRight className="ml-1 h-2 w-2" />
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {insight.message}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
