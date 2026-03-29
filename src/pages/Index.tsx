import { useState, useEffect, useMemo, useRef } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import {
  Settings, Users, Building2, ShoppingCart, Package, TrendingUp,
  FileText, Wallet, BarChart3, ArrowRight, DollarSign, AlertCircle,
  Truck, CreditCard, ArrowUpRight, ArrowDownRight, Loader2,
} from "lucide-react";

/* ─── animated counter ─── */
function useAnimatedNumber(target: number, duration = 1000) {
  const [value, setValue] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current;
    prev.current = target;
    if (target === 0 && start === 0) return;
    let t0: number;
    const step = (ts: number) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setValue(start + (target - start) * ease);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return value;
}

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const modules = [
  { label: "Achats", icon: ShoppingCart, path: "/achats/commandes", desc: "Fournisseurs & commandes", color: "hsl(38, 92%, 50%)" },
  { label: "Stock", icon: Package, path: "/stock/niveaux", desc: "Inventaire & mouvements", color: "hsl(152, 60%, 45%)" },
  { label: "Ventes", icon: TrendingUp, path: "/ventes/devis", desc: "Clients & devis", color: "hsl(197, 100%, 53%)" },
  { label: "Facturation", icon: FileText, path: "/facturation/clients", desc: "Factures & avoirs", color: "hsl(210, 60%, 16%)" },
  { label: "Règlements", icon: Wallet, path: "/reglements/encaissements", desc: "Paiements & trésorerie", color: "hsl(280, 60%, 55%)" },
  { label: "Tableaux de Bord", icon: BarChart3, path: "/tableaux-de-bord", desc: "Analyses & rapports", color: "hsl(197, 100%, 53%)" },
];

const Index = () => {
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? null;
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState({ revenue: 0, unpaid: 0, supplierDebt: 0, cash: 0, userCount: 0, productCount: 0 });

  const animRevenue = useAnimatedNumber(kpi.revenue);
  const animUnpaid = useAnimatedNumber(kpi.unpaid);
  const animDebt = useAnimatedNumber(kpi.supplierDebt);
  const animCash = useAnimatedNumber(kpi.cash);

  useEffect(() => {
    const fetch = async () => {
      if (!companyId) { setKpi({ revenue: 0, unpaid: 0, supplierDebt: 0, cash: 0, userCount: 0, productCount: 0 }); setLoading(false); return; }
      setLoading(true);
      const [clientInv, suppInv, banks, profiles, products] = await Promise.all([
        (supabase as any).from("invoices").select("total_ttc, remaining_balance").eq("invoice_type", "client").eq("company_id", companyId).in("status", ["validated", "paid"]),
        (supabase as any).from("invoices").select("remaining_balance").eq("invoice_type", "supplier").eq("company_id", companyId).in("status", ["validated", "paid"]),
        (supabase as any).from("bank_accounts").select("current_balance").eq("is_active", true).eq("company_id", companyId),
        (supabase as any).from("profiles").select("id", { count: "exact", head: true }),
        (supabase as any).from("products").select("id", { count: "exact", head: true }).eq("company_id", companyId),
      ]);
      const revenue = (clientInv.data || []).reduce((s: number, i: any) => s + Number(i.total_ttc), 0);
      const unpaid = (clientInv.data || []).reduce((s: number, i: any) => s + Number(i.remaining_balance), 0);
      const supplierDebt = (suppInv.data || []).reduce((s: number, i: any) => s + Number(i.remaining_balance), 0);
      const cash = (banks.data || []).reduce((s: number, b: any) => s + Number(b.current_balance), 0);
      setKpi({ revenue, unpaid, supplierDebt, cash, userCount: profiles.count || 0, productCount: products.count || 0 });
      setLoading(false);
    };
    fetch();
  }, [companyId]);

  const kpiCards = [
    { label: "Chiffre d'affaires", value: fmt(animRevenue), suffix: "MAD", icon: DollarSign, color: "hsl(197, 100%, 53%)", path: "/facturation/clients", trend: "up" as const },
    { label: "Impayés clients", value: fmt(animUnpaid), suffix: "MAD", icon: AlertCircle, color: "hsl(0, 84%, 60%)", path: "/reglements/impayes", trend: kpi.unpaid > 0 ? "down" as const : undefined },
    { label: "Dettes fournisseurs", value: fmt(animDebt), suffix: "MAD", icon: Truck, color: "hsl(38, 92%, 50%)", path: "/achats/commandes" },
    { label: "Trésorerie", value: fmt(animCash), suffix: "MAD", icon: Wallet, color: "hsl(152, 60%, 45%)", path: "/reglements/encaissements" },
  ];

  const stats = [
    { label: "Utilisateurs actifs", value: String(kpi.userCount || "—"), icon: Users, color: "hsl(197, 100%, 53%)" },
    { label: "Produits", value: String(kpi.productCount || "—"), icon: Package, color: "hsl(152, 60%, 45%)" },
    { label: "Modules actifs", value: "6", icon: Settings, color: "hsl(38, 92%, 50%)" },
  ];

  return (
    <AppLayout title="Administration" subtitle="Vue d'ensemble de votre activité">
      <div className="space-y-6 animate-fade-in">
        {loading && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {/* KPI Cards — clickable */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((card) => (
            <Link
              key={card.label}
              to={card.path}
              className="group relative rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-elevated"
              style={{
                background: `linear-gradient(135deg, ${card.color}, ${card.color.replace(")", ", 0.7)")})`,
                boxShadow: "0 4px 20px -4px rgba(0,0,0,0.2)",
              }}
            >
              <div className="absolute inset-0 bg-white/[0.06]" />
              <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/[0.07]" />
              <div className="relative p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white/15">
                    <card.icon className="h-5 w-5 text-white" />
                  </div>
                  {card.trend && (
                    <div className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-white/15 text-white">
                      {card.trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    </div>
                  )}
                </div>
                <p className="text-2xl font-extrabold text-white tracking-tight leading-none">
                  {card.value} <span className="text-sm font-normal text-white/70">{card.suffix}</span>
                </p>
                <p className="text-sm text-white/80 mt-1.5 font-medium">{card.label}</p>
              </div>
              <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 text-white/0 group-hover:text-white/60 transition-all duration-300 group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="relative bg-card rounded-xl border border-border overflow-hidden transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5">
              <div className="h-1 w-full" style={{ background: stat.color }} />
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${stat.color}18` }}>
                    <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Modules */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Modules ERP
            </h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {modules.map((mod) => (
                <Link
                  key={mod.path}
                  to={mod.path}
                  className="group relative p-4 rounded-xl border border-border hover:border-primary/30 hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${mod.color}15` }}>
                    <mod.icon className="h-5 w-5" style={{ color: mod.color }} />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{mod.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{mod.desc}</p>
                  <ArrowRight className="absolute top-4 right-4 h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all duration-300 group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Index;
