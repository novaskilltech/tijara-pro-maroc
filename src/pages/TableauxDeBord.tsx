import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import {
  DollarSign, TrendingUp, Wallet, Package, Users, Truck,
  Download, AlertTriangle, AlertCircle, ArrowUpRight, ArrowDownRight,
  Calendar, FileText, ChevronRight, ArrowRight, ShieldAlert,
  CreditCard, BarChart3, Tag, Layers, TrendingDown,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCompany } from "@/hooks/useCompany";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, getDaysInMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardInsights } from "@/components/dashboard/DashboardInsights";
import { subMonths, isSameMonth, parseISO } from "date-fns";

const MONTH_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
const MONTH_FULL_LABELS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

type QuickFilter = "today" | "week" | "month" | "custom" | "year";

/* ─── types ─── */
interface KPI {
  revenue: number;
  supplierDebt: number;
  customerUnpaid: number;
  cashPosition: number;
  paidInvoices: number;
  pendingInvoices: number;
  grossMargin: number;
  totalPurchases: number;
  profit: number;
}

interface RecentTx {
  id: string;
  label: string;
  amount: number;
  date: string;
  type: "in" | "out";
}

interface RankedItem {
  name: string;
  value: number;
  pct?: number;
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(152, 60%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 60%, 55%)",
  "hsl(0, 84%, 60%)",
];

/* ─── animated counter ─── */
function useAnimatedNumber(target: number, duration = 1200) {
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

const fmtShort = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(0);
};

/* ─── custom tooltip ─── */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-elevated p-3 text-sm">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((e: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.color }} />
          <span className="text-muted-foreground">{e.name}:</span>
          <span className="font-semibold text-foreground">{fmt(Number(e.value))} MAD</span>
        </div>
      ))}
    </div>
  );
};

/* ─── Quick filter helpers ─── */
function getQuickFilterRange(filter: QuickFilter): { from: string; to: string } {
  const today = new Date();
  switch (filter) {
    case "today":
      return { from: format(today, "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd") };
    case "week": {
      const ws = startOfWeek(today, { weekStartsOn: 1 });
      const we = endOfWeek(today, { weekStartsOn: 1 });
      return { from: format(ws, "yyyy-MM-dd"), to: format(we, "yyyy-MM-dd") };
    }
    case "month": {
      const ms = startOfMonth(today);
      const me = endOfMonth(today);
      return { from: format(ms, "yyyy-MM-dd"), to: format(me, "yyyy-MM-dd") };
    }
    default:
      return { from: "", to: "" };
  }
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
const TableauxDeBord = () => {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.id ?? null;
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<KPI>({
    revenue: 0, supplierDebt: 0, customerUnpaid: 0,
    cashPosition: 0, paidInvoices: 0, pendingInvoices: 0,
    grossMargin: 0, totalPurchases: 0, profit: 0,
  });
  const [monthlyData, setMonthlyData] = useState<{ month: string; ventes: number; achats: number }[]>([]);
  const [dailyData, setDailyData] = useState<{ day: string; ventes: number; achats: number }[]>([]);
  const [topClients, setTopClients] = useState<RankedItem[]>([]);
  const [topProducts, setTopProducts] = useState<RankedItem[]>([]);
  const [topCategories, setTopCategories] = useState<RankedItem[]>([]);
  const [topSubcategories, setTopSubcategories] = useState<RankedItem[]>([]);
  const [recentTx, setRecentTx] = useState<RecentTx[]>([]);
  const [stockAlerts, setStockAlerts] = useState<{ name: string; qty: number }[]>([]);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-indexed
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Quick filter state
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // Month drill-down state for the evolution chart
  const [drillMonth, setDrillMonth] = useState<number | null>(currentMonth);

  // Compute effective date range
  const effectiveRange = useMemo(() => {
    if (quickFilter === "year") {
      return { from: `${selectedYear}-01-01`, to: `${selectedYear}-12-31` };
    }
    if (quickFilter === "custom") {
      return {
        from: customFrom || `${selectedYear}-01-01`,
        to: customTo || `${selectedYear}-12-31`,
      };
    }
    return getQuickFilterRange(quickFilter);
  }, [quickFilter, customFrom, customTo, selectedYear]);

  const dateFrom = effectiveRange.from;
  const dateTo = effectiveRange.to;

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [revenueGrowth, setRevenueGrowth] = useState(0);
  const [stockAlertsCount, setStockAlertsCount] = useState(0);

  const animRevenue = useAnimatedNumber(kpi.revenue);
  const animMargin = useAnimatedNumber(kpi.grossMargin);
  const animUnpaid = useAnimatedNumber(kpi.customerUnpaid);
  const animDebt = useAnimatedNumber(kpi.supplierDebt);
  const animProfit = useAnimatedNumber(kpi.profit);

  const marginPct = useMemo(
    () => (kpi.revenue > 0 ? (kpi.grossMargin / kpi.revenue) * 100 : 0),
    [kpi.revenue, kpi.grossMargin],
  );
  const profitPct = useMemo(
    () => (kpi.revenue > 0 ? (kpi.profit / kpi.revenue) * 100 : 0),
    [kpi.revenue, kpi.profit],
  );

  const handleQuickFilter = (f: QuickFilter) => {
    if (f === "today" || f === "week" || f === "month") {
      setSelectedYear(currentYear);
    }
    setQuickFilter(f);
    if (f !== "custom") {
      setCustomFrom("");
      setCustomTo("");
    }
    if (f === "month") {
      setDrillMonth(new Date().getMonth());
    } else {
      setDrillMonth(null);
    }
  };

  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    setQuickFilter("year");
    setCustomFrom("");
    setCustomTo("");
    setDrillMonth(null);
  };

  const handleCustomDateChange = (field: "from" | "to", value: string) => {
    setQuickFilter("custom");
    if (field === "from") setCustomFrom(value);
    else setCustomTo(value);
  };

  /* ─── data fetching ─── */
  const fetchData = useCallback(async () => {
    setLoading(true);

    const scopeInv = (q: any) => companyId ? q.eq("company_id", companyId) : q;
    const scopeLines = (q: any) => companyId ? q.eq("company_id", companyId) : q;
    const scopeBank = (q: any) => companyId ? q.eq("company_id", companyId) : q;
    const scopePay = (q: any) => companyId ? q.eq("company_id", companyId) : q;

    const chartYear = selectedYear;
    const chartFrom = `${chartYear}-01-01`;
    const chartTo = `${chartYear}-12-31`;

    const fetchFrom = dateFrom < chartFrom ? dateFrom : chartFrom;
    const fetchTo = dateTo > chartTo ? dateTo : chartTo;

    const [clientInvRes, suppInvRes, banksRes, paymentsRes, lowStockRes, invoiceLinesRes] = await Promise.all([
      scopeInv((supabase as any)
        .from("invoices")
        .select("total_ttc, remaining_balance, status, invoice_date, customer:customers(name)")
        .eq("invoice_type", "client")
        .in("status", ["validated", "paid"])
        .gte("invoice_date", fetchFrom)
        .lte("invoice_date", fetchTo)),
      scopeInv((supabase as any)
        .from("invoices")
        .select("remaining_balance, total_ttc, invoice_date")
        .eq("invoice_type", "supplier")
        .in("status", ["validated", "paid"])
        .gte("invoice_date", fetchFrom)
        .lte("invoice_date", fetchTo)),
      scopeBank((supabase as any).from("bank_accounts").select("current_balance").eq("is_active", true)),
      scopePay((supabase as any)
        .from("payments")
        .select("id, payment_number, amount, payment_date, payment_type")
        .order("payment_date", { ascending: false })
        .limit(5)),
      (supabase as any)
        .from("stock_levels")
        .select("stock_on_hand, product:products(name, min_stock)")
        .limit(20),
      scopeLines((supabase as any)
        .from("invoice_lines")
        .select("total_ttc, total_ht, unit_price, quantity, product:products(name, category_id, category:product_categories(name, parent_id, parent:product_categories!product_categories_parent_id_fkey(name)))")
        .gte("created_at", fetchFrom + "T00:00:00")
        .lte("created_at", fetchTo + "T23:59:59")),
    ]);

    const clientInv = clientInvRes.data || [];
    const suppInv = suppInvRes.data || [];

    const filteredClientInv = clientInv.filter((i: any) => i.invoice_date >= dateFrom && i.invoice_date <= dateTo);
    const filteredSuppInv = suppInv.filter((i: any) => i.invoice_date >= dateFrom && i.invoice_date <= dateTo);

    const revenue = filteredClientInv.reduce((s: number, i: any) => s + Number(i.total_ttc), 0);
    const customerUnpaid = clientInv.reduce((s: number, i: any) => s + Number(i.remaining_balance), 0);
    const paidInvoices = filteredClientInv.filter((i: any) => i.status === "paid").length;
    const pendingInvoices = filteredClientInv.filter((i: any) => i.status === "validated").length;
    const supplierDebt = suppInv.reduce((s: number, i: any) => s + Number(i.remaining_balance), 0);
    const totalPurchases = filteredSuppInv.reduce((s: number, i: any) => s + Number(i.total_ttc), 0);
    const cashPosition = (banksRes.data || []).reduce((s: number, b: any) => s + Number(b.current_balance), 0);
    const grossMargin = revenue - totalPurchases;
    const profit = grossMargin * 0.6;

    setKpi({ revenue, supplierDebt, customerUnpaid, cashPosition, paidInvoices, pendingInvoices, grossMargin, totalPurchases, profit });

    const monthMap = new Map<string, { ventes: number; achats: number }>();
    for (let m = 1; m <= 12; m++) {
      const key = `${selectedYear}-${String(m).padStart(2, "0")}`;
      monthMap.set(key, { ventes: 0, achats: 0 });
    }
    clientInv.forEach((inv: any) => {
      const m = inv.invoice_date.substring(0, 7);
      if (monthMap.has(m)) monthMap.get(m)!.ventes += Number(inv.total_ttc);
    });
    suppInv.forEach((inv: any) => {
      const m = inv.invoice_date.substring(0, 7);
      if (monthMap.has(m)) monthMap.get(m)!.achats += Number(inv.total_ttc);
    });
    setMonthlyData(Array.from(monthMap.entries()).sort().map(([month, v]) => {
      const mIdx = parseInt(month.split("-")[1], 10) - 1;
      return { month: MONTH_LABELS[mIdx], ...v };
    }));

    if (drillMonth !== null) {
      const daysInMonth = getDaysInMonth(new Date(selectedYear, drillMonth));
      const dayMap = new Map<number, { ventes: number; achats: number }>();
      for (let d = 1; d <= daysInMonth; d++) {
        dayMap.set(d, { ventes: 0, achats: 0 });
      }
      clientInv.forEach((inv: any) => {
        const date = new Date(inv.invoice_date);
        if (date.getMonth() === drillMonth && date.getFullYear() === selectedYear) {
          const d = date.getDate();
          if (dayMap.has(d)) dayMap.get(d)!.ventes += Number(inv.total_ttc);
        }
      });
      suppInv.forEach((inv: any) => {
        const date = new Date(inv.invoice_date);
        if (date.getMonth() === drillMonth && date.getFullYear() === selectedYear) {
          const d = date.getDate();
          if (dayMap.has(d)) dayMap.get(d)!.achats += Number(inv.total_ttc);
        }
      });
      setDailyData(Array.from(dayMap.entries()).sort((a, b) => a[0] - b[0]).map(([day, v]) => ({
        day: String(day),
        ...v,
      })));
    } else {
      setDailyData([]);
    }

    const cm = new Map<string, number>();
    clientInv.forEach((inv: any) => {
      const n = inv.customer?.name || "Inconnu";
      cm.set(n, (cm.get(n) || 0) + Number(inv.total_ttc));
    });
    const clientsSorted = Array.from(cm.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const totalClientsRevenue = clientsSorted.reduce((s, [, v]) => s + v, 0);
    setTopClients(clientsSorted.map(([name, value]) => ({
      name, value,
      pct: totalClientsRevenue > 0 ? Math.round((value / totalClientsRevenue) * 100) : 0,
    })));

    const invLines = invoiceLinesRes.data || [];
    const prodMap = new Map<string, number>();
    const catMap = new Map<string, number>();
    const subCatMap = new Map<string, number>();

    invLines.forEach((line: any) => {
      const ttc = Number(line.total_ttc || 0);
      const pName = line.product?.name || "Sans produit";
      prodMap.set(pName, (prodMap.get(pName) || 0) + ttc);
      const cat = line.product?.category;
      if (cat) {
        if (cat.parent_id && cat.parent) {
          const parentName = cat.parent?.name || "—";
          catMap.set(parentName, (catMap.get(parentName) || 0) + ttc);
          subCatMap.set(cat.name, (subCatMap.get(cat.name) || 0) + ttc);
        } else {
          catMap.set(cat.name, (catMap.get(cat.name) || 0) + ttc);
        }
      }
    });

    const topProds = Array.from(prodMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const totalProds = topProds.reduce((s, [, v]) => s + v, 0);
    setTopProducts(topProds.map(([name, value]) => ({
      name, value,
      pct: totalProds > 0 ? Math.round((value / totalProds) * 100) : 0,
    })));

    const topCats = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const totalCats = topCats.reduce((s, [, v]) => s + v, 0);
    setTopCategories(topCats.map(([name, value]) => ({
      name, value,
      pct: totalCats > 0 ? Math.round((value / totalCats) * 100) : 0,
    })));

    const topSubCats = Array.from(subCatMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const totalSubCats = topSubCats.reduce((s, [, v]) => s + v, 0);
    setTopSubcategories(topSubCats.map(([name, value]) => ({
      name, value,
      pct: totalSubCats > 0 ? Math.round((value / totalSubCats) * 100) : 0,
    })));

    setRecentTx(
      (paymentsRes.data || []).map((p: any) => ({
        id: p.id,
        label: p.payment_number,
        amount: Number(p.amount),
        date: p.payment_date,
        type: p.payment_type === "incoming" ? "in" as const : "out" as const,
      })),
    );

    const alerts = (lowStockRes.data || [])
      .filter((s: any) => s.product && Number(s.stock_on_hand) <= Number(s.product.min_stock))
      .slice(0, 5)
      .map((s: any) => ({ name: s.product.name, qty: Number(s.stock_on_hand) }));
    setStockAlerts(alerts);

    // Calculate Insights
    const currentMonth = new Date().getMonth();
    const prevMonthIdx = currentMonth === 0 ? 11 : currentMonth - 1;
    const currentRev = monthlyData[currentMonth]?.ventes || 0;
    const prevRev = monthlyData[prevMonthIdx]?.ventes || 0;
    
    if (prevRev > 0) {
      setRevenueGrowth(Math.round(((currentRev - prevRev) / prevRev) * 100));
    } else {
      setRevenueGrowth(currentRev > 0 ? 100 : 0);
    }
    
    setStockAlertsCount((lowStockRes.data || []).length);
    setLoading(false);
  }, [companyId, dateFrom, dateTo, selectedYear, drillMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const handler = () => { fetchData(); };
    window.addEventListener("dashboard-refresh", handler);
    return () => window.removeEventListener("dashboard-refresh", handler);
  }, [fetchData]);

  const exportCSV = () => {
    const header = "Mois,Ventes,Achats\n";
    const rows = monthlyData.map((r) => `${r.month},${r.ventes.toFixed(2)},${r.achats.toFixed(2)}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "rapport-tijarapro.csv"; a.click();
  };

  const chartData = drillMonth !== null ? dailyData : monthlyData;
  const chartDataKey = drillMonth !== null ? "day" : "month";
  const chartTitle = drillMonth !== null
    ? `Évolution journalière — ${MONTH_FULL_LABELS[drillMonth]} ${selectedYear}`
    : `Évolution mensuelle — ${quickFilter === "custom" ? "Période personnalisée" : selectedYear}`;

  const QUICK_FILTERS: { key: QuickFilter; label: string }[] = [
    { key: "today", label: "Aujourd'hui" },
    { key: "week", label: "Cette semaine" },
    { key: "month", label: "Ce mois" },
  ];

  return (
    <AppLayout title="Tableaux de Bord" subtitle="Vue exécutive de votre activité">
      <div className="space-y-6 animate-fade-in">

        {/* ── Filter bar ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 bg-card rounded-xl border border-border px-1.5 py-1.5 shadow-card">
              {QUICK_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => handleQuickFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    quickFilter === f.key
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-card rounded-xl border border-border px-3 py-2 shadow-card">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={String(selectedYear)} onValueChange={(v) => handleYearChange(Number(v))}>
                <SelectTrigger className="border-0 bg-transparent p-0 h-auto text-sm w-[80px] focus:ring-0 shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className={`flex items-center gap-2 bg-card rounded-xl border px-3 py-2 shadow-card transition-colors duration-200 ${
              quickFilter === "custom" ? "border-primary/50" : "border-border"
            }`}>
              <Input type="date" value={customFrom} onChange={(e) => handleCustomDateChange("from", e.target.value)}
                className="border-0 bg-transparent p-0 h-auto text-sm w-[130px] focus-visible:ring-0" />
              <span className="text-muted-foreground text-sm">→</span>
              <Input type="date" value={customTo} onChange={(e) => handleCustomDateChange("to", e.target.value)}
                className="border-0 bg-transparent p-0 h-auto text-sm w-[130px] focus-visible:ring-0" />
              {quickFilter === "custom" && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => handleQuickFilter("today")}>✕</Button>
              )}
            </div>
          </div>
          <Button variant="outline" onClick={exportCSV} className="gap-2 rounded-xl">
            <Download className="h-4 w-4" /> Exporter
          </Button>
        </div>

        {!isMobile ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <HeroKPI label="Chiffre d'affaires" value={fmt(animRevenue)} suffix="MAD" icon={DollarSign} color="primary" trend="up" trendValue={kpi.revenue > 0 ? `+${fmtShort(kpi.revenue)}` : undefined} />
              <HeroKPI label="Marge brute" value={fmt(animMargin)} suffix="MAD" icon={TrendingUp} color={kpi.grossMargin >= 0 ? "success" : "destructive"} trend={kpi.grossMargin >= 0 ? "up" : "down"} trendValue={kpi.revenue > 0 ? `${marginPct.toFixed(1)}%` : "—"} />
              <HeroKPI label="Bénéfice net" value={fmt(animProfit)} suffix="MAD" icon={BarChart3} color={kpi.profit >= 0 ? "indigo" : "destructive"} trend={kpi.profit >= 0 ? "up" : "down"} trendValue={kpi.revenue > 0 ? `${profitPct.toFixed(1)}%` : "—"} />
              <HeroKPI label="Impayés clients" value={fmt(animUnpaid)} suffix="MAD" icon={AlertCircle} color="destructive" trend={kpi.customerUnpaid > 0 ? "down" : undefined} trendValue={kpi.pendingInvoices > 0 ? `${kpi.pendingInvoices} en attente` : undefined} />
              <HeroKPI label="Dettes fournisseurs" value={fmt(animDebt)} suffix="MAD" icon={Truck} color="warning" />
              <CircularWidget paid={kpi.paidInvoices} pending={kpi.pendingInvoices} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-8">
                <DashboardInsights kpi={kpi} stockAlertsCount={stockAlertsCount} revenueGrowth={revenueGrowth} />
              </div>
              <div className="lg:col-span-4">
                <Card className="h-full border border-border shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Répartition Stock</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px] flex items-center justify-center">
                       <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                           <Pie data={topSubcategories} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                             {topSubcategories.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                             ))}
                           </Pie>
                           <Tooltip />
                         </PieChart>
                       </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-10 gap-5">
              <Card className="lg:col-span-7 border border-border rounded-xl shadow-card overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base font-semibold">{chartTitle}</CardTitle>
                      {drillMonth !== null && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                          onClick={() => setDrillMonth(null)}>
                          ← Vue annuelle
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Select value={drillMonth !== null ? String(drillMonth) : "all"} onValueChange={(v) => setDrillMonth(v === "all" ? null : Number(v))}>
                        <SelectTrigger className="h-8 w-[140px] text-xs rounded-lg border-border">
                          <SelectValue placeholder="Mois" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Vue annuelle</SelectItem>
                          {MONTH_FULL_LABELS.map((label, idx) => (
                            <SelectItem key={idx} value={String(idx)}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary" /> Ventes</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "hsl(210,60%,16%)" }} /> Achats</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <ResponsiveContainer width="100%" height={340}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(197,100%,53%)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="hsl(197,100%,53%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(216,18%,88%)" strokeOpacity={0.5} />
                      <XAxis dataKey={chartDataKey} fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="ventes" name="Ventes" stroke="hsl(197,100%,53%)" strokeWidth={2.5} fill="url(#gV)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="lg:col-span-3 space-y-5">
                <MiniMetricCard label="TVA à reverser" value="12,450.00" sub="Mois en cours" color="hsl(var(--primary))" icon={Tag} />
                <MiniMetricCard label="Moyenne panier" value={fmt(animRevenue / (kpi.paidInvoices + kpi.pendingInvoices || 1))} sub="Total CA / Factures" color="#10b981" icon={Wallet} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <RankedListCard title="Top Clients" subtitle="Par chiffre d'affaires" icon={Users} iconColor="hsl(var(--primary))" iconBg="hsl(var(--primary)/15%)" items={topClients} chartData={topClients} emptyText="Aucun client" emptyIcon={Users} />
              <RankedListCard title="Top Produits" subtitle="Performances volume" icon={Package} iconColor="hsl(var(--primary))" iconBg="hsl(var(--primary)/15%)" items={topProducts} chartData={topProducts} emptyText="Aucun produit" emptyIcon={Package} />
              <RankedListCard title="Catégories" subtitle="Répartition CA" icon={Layers} iconColor="hsl(38,92%,50%)" iconBg="hsl(38,92%,50%,0.15)" items={topSubcategories} chartData={topSubcategories} emptyText="Aucune catégorie" emptyIcon={Layers} chartColor="hsl(38,92%,50%)" />
            </div>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid grid-cols-4 w-full h-12 bg-card border border-border sticky top-0 z-10 p-1">
              <TabsTrigger value="overview" className="text-[10px] uppercase font-bold tracking-tight">Focus</TabsTrigger>
              <TabsTrigger value="charts" className="text-[10px] uppercase font-bold tracking-tight">Analyse</TabsTrigger>
              <TabsTrigger value="stock" className="text-[10px] uppercase font-bold tracking-tight">Stock</TabsTrigger>
              <TabsTrigger value="cash" className="text-[10px] uppercase font-bold tracking-tight">Cash</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <HeroKPI label="CA" value={fmtShort(animRevenue)} suffix="MAD" icon={DollarSign} color="primary" trend="up" />
                <HeroKPI label="Marge" value={fmtShort(animMargin)} suffix="MAD" icon={TrendingUp} color="success" trend={kpi.grossMargin >= 0 ? "up" : "down"} />
                <HeroKPI label="Impayés" value={fmtShort(animUnpaid)} suffix="MAD" icon={AlertCircle} color="destructive" />
                <HeroKPI label="Bénéfice" value={fmtShort(animProfit)} suffix="MAD" icon={BarChart3} color="indigo" />
              </div>
              <DashboardInsights kpi={kpi} stockAlertsCount={stockAlertsCount} revenueGrowth={revenueGrowth} />
            </TabsContent>

            <TabsContent value="charts" className="space-y-4">
              <Card className="border border-border rounded-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">{chartTitle}</CardTitle>
                </CardHeader>
                <CardContent className="h-[280px] pt-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey={chartDataKey} fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis hide />
                      <Tooltip />
                      <Area type="monotone" dataKey="ventes" stroke="hsl(var(--primary))" fillOpacity={0.1} fill="hsl(var(--primary))" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <RankedListCard title="Top Clients" subtitle="Ventes par client" icon={Users} iconColor="var(--primary)" iconBg="hsl(var(--primary)/10%)" items={topClients} chartData={topClients} emptyText="Aucun client" emptyIcon={Users} />
            </TabsContent>
            
            <TabsContent value="stock" className="space-y-4">
              <Card className="border border-border rounded-xl shadow-card">
                <CardHeader className="pb-2">
                   <CardTitle className="text-sm font-semibold">Alertes Stock</CardTitle>
                </CardHeader>
                <CardContent>
                  {stockAlerts.length > 0 ? (
                    <div className="space-y-3">
                      {stockAlerts.map((a, i) => (
                        <div key={i} className="flex items-center justify-between text-xs py-2 border-b last:border-0 border-border/50">
                          <span className="font-medium truncate max-w-[150px]">{a.name}</span>
                          <Badge variant="destructive" className="h-5 text-[10px]">{a.qty} restants</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptySection icon={Package} text="Tout est en stock" />
                  )}
                </CardContent>
              </Card>
              <RankedListCard title="Top Produits" subtitle="Performances" icon={Package} iconColor="var(--primary)" iconBg="hsl(var(--primary)/10%)" items={topProducts} chartData={topProducts} emptyText="Aucun produit" emptyIcon={Package} />
            </TabsContent>

            <TabsContent value="cash" className="space-y-4">
              <Card className="border border-border rounded-xl shadow-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Derniers Flux</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentTx.slice(0, 5).map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between text-xs">
                        <div className="flex flex-col">
                          <span className="font-bold">{tx.label}</span>
                          <span className="text-muted-foreground text-[10px]">{tx.date}</span>
                        </div>
                        <span className={tx.type === "in" ? "text-green-600 font-bold" : "text-red-500 font-bold"}>
                          {tx.type === "in" ? "+" : "-"}{fmtShort(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
};

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
   ───────────────────────────────────────────── */

function HeroKPI({ label, value, suffix, icon: Icon, color, trend, trendValue }: {
  label: string; value: string; suffix: string; icon: React.ElementType;
  color: string; trend?: "up" | "down"; trendValue?: string;
}) {
  const gradients: Record<string, string> = {
    primary: "linear-gradient(135deg, hsl(197, 100%, 53%), hsl(197, 85%, 42%))",
    success: "linear-gradient(135deg, hsl(142, 72%, 50%), hsl(142, 64%, 38%))",
    destructive: "linear-gradient(135deg, hsl(0, 84%, 60%), hsl(0, 72%, 52%))",
    warning: "linear-gradient(135deg, hsl(38, 92%, 50%), hsl(25, 90%, 48%))",
    indigo: "linear-gradient(135deg, hsl(239, 84%, 67%), hsl(239, 70%, 56%))",
  };

  return (
    <div
      className="group relative rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-elevated cursor-default"
      style={{ background: gradients[color] || gradients.primary, boxShadow: "0 4px 20px -4px rgba(0,0,0,0.2)" }}
    >
      <div className="absolute inset-0 bg-white/[0.06]" />
      <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/[0.07]" />
      <div className="relative p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/15">
            <Icon className="h-4 w-4 text-white" />
          </div>
          {trend && trendValue && (
            <div className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-white/15 text-white">
              {trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {trendValue}
            </div>
          )}
        </div>
        <p className="text-xl font-extrabold text-white tracking-tight leading-none">
          {value} <span className="text-xs font-normal text-white/70">{suffix}</span>
        </p>
        <p className="text-xs text-white/80 mt-1 font-medium">{label}</p>
      </div>
    </div>
  );
}

function CircularWidget({ paid, pending }: { paid: number; pending: number }) {
  const total = paid + pending;
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div
      className="group rounded-xl overflow-hidden shadow-card p-4 flex flex-col items-center justify-center"
      style={{ background: "linear-gradient(135deg, hsl(239, 84%, 67%), hsl(239, 70%, 56%))" }}
    >
      <div className="relative w-20 h-20 mb-2">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6" />
          <circle cx="48" cy="48" r="40" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-extrabold text-white">{pct}%</span>
        </div>
      </div>
      <p className="text-xs font-semibold text-white">Payé</p>
    </div>
  );
}

function MiniMetricCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: string; sub: string; color: string; icon: React.ElementType;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
          <Icon className="h-3.5 w-3.5" style={{ color }} />
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}

function RankedListCard({ title, subtitle, icon: Icon, iconColor, iconBg, items, chartData, emptyText, emptyIcon: EmptyIcon, chartColor }: {
  title: string; subtitle: string; icon: React.ElementType; iconColor: string; iconBg: string; items: RankedItem[];
  chartData: RankedItem[]; emptyText: string; emptyIcon: React.ElementType; chartColor?: string;
}) {
  const color = chartColor || "hsl(var(--primary))";
  return (
    <Card className="border border-border rounded-xl overflow-hidden shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: iconBg }}>
            <Icon className="h-4 w-4" style={{ color: iconColor }} />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {items.length > 0 ? (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={chartData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" hide />
                <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="truncate max-w-[140px]">{item.name}</span>
                  <span className="font-semibold">{fmtShort(item.value)} MAD</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptySection icon={EmptyIcon} text={emptyText} />
        )}
      </CardContent>
    </Card>
  );
}

function EmptySection({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <Icon className="h-8 w-8 text-muted-foreground/30 mb-2" />
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  );
}

export default TableauxDeBord;
