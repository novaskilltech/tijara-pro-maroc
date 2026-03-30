import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useCrud } from "@/hooks/useCrud";
import { useCompany } from "@/hooks/useCompany";
import { MasterDataPage, FieldConfig } from "@/components/MasterDataPage";
import { SupplierKanban } from "@/components/master/SupplierKanban";
import { SupplierImport } from "@/components/master/SupplierImport";
import { TierDetailDialog } from "@/components/master/TierDetailDialog";
import { ViewToggle } from "@/components/ViewToggle";
import { AdvancedSearch, applyAdvancedSearch, type SearchOperator, type SearchableField, type FilterOption, type QuickFilter } from "@/components/AdvancedSearch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, AlertCircle, AlertTriangle, Plus, Copy, Download, Upload } from "lucid-react";
import { toast } from "sonner";
import { excelExport } from "@/lib/excel-export";
import { usePermissions } from "@/hooks/usePermissions";

interface Supplier {
  id: string; code: string; name: string; contact_name: string; email: string;
  phone: string; phone2: string; city: string; ice: string; rc: string;
  if_number: string; patente: string; address: string; payment_terms: string;
  credit_limit: number; is_active: boolean; bank_id: string | null; bank_name: string; rib: string;
  account_number: string; iban: string; swift: string; fax: string; notes: string;
  entity_type: "physique" | "morale";
}

interface SupplierStats {
  [supplierId: string]: { totalPurchases: number; outstandingDebt: number };
}

const fmtNum = (n: number) => n.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SEARCH_FIELDS: SearchableField[] = [
  { key: "name", label: "Nom" },
  { key: "ice", label: "ICE" },
  { key: "phone", label: "Téléphone" },
  { key: "email", label: "Email" },
  { key: "city", label: "Ville" },
  { key: "code", label: "Code" },
];

const FILTERS: FilterOption[] = [
  { key: "is_active", label: "Statut", type: "boolean", trueLabel: "Actif", falseLabel: "Bloqué" },
  { key: "has_debt", label: "Dettes", type: "boolean", trueLabel: "Oui", falseLabel: "Non" },
  {
    key: "payment_terms", label: "Conditions paiement", type: "select",
    options: [
      { value: "30j", label: "30 jours" },
      { value: "60j", label: "60 jours" },
      { value: "90j", label: "90 jours" },
    ],
  },
];

const QUICK_FILTERS: QuickFilter[] = [
  { label: "Actifs uniquement", filters: { is_active: "true" } },
  { label: "Avec dettes", filters: { has_debt: "true" } },
  { label: "Bloqués", filters: { is_active: "false" } },
];

export default function SuppliersPage() {
  const { activeCompany } = useCompany();
  const { can } = usePermissions();
  const companyId = activeCompany?.id ?? null;
  const { data, loading, fetch, create, update, remove } = useCrud<Supplier>({ table: "suppliers", orderBy: "code", ascending: true, companyScoped: true });

  const [stats, setStats] = useState<SupplierStats>({});
  const [statsLoading, setStatsLoading] = useState(false);
  const [view, setView] = useState<"list" | "kanban">("list");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<Supplier | null>(null);
  const [isNew, setIsNew] = useState(false);

  const [searchState, setSearchState] = useState<{
    query: string; operator: SearchOperator; activeFilters: Record<string, string>;
  }>({ query: "", operator: "contains", activeFilters: {} });

  const fetchStats = useCallback(async () => {
    if (!data.length) return;
    setStatsLoading(true);
    let query = (supabase as any)
      .from("invoices")
      .select("supplier_id, total_ttc, remaining_balance")
      .eq("invoice_type", "supplier")
      .in("status", ["validated", "paid"]);
    if (companyId) query = query.eq("company_id", companyId);
    const { data: invoices } = await query;
    const map: SupplierStats = {};
    (invoices || []).forEach((inv: any) => {
      const sid = inv.supplier_id;
      if (!sid) return;
      if (!map[sid]) map[sid] = { totalPurchases: 0, outstandingDebt: 0 };
      map[sid].totalPurchases += Number(inv.total_ttc);
      map[sid].outstandingDebt += Number(inv.remaining_balance);
    });
    setStats(map);
    setStatsLoading(false);
  }, [data, companyId]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const filtered = applyAdvancedSearch(
    data,
    SEARCH_FIELDS.map((f) => f.key),
    searchState.query,
    searchState.operator,
    searchState.activeFilters,
    {
      is_active: (item, value) => String(item.is_active !== false) === value,
      has_debt: (item, value) => {
        const debt = (stats[item.id]?.outstandingDebt ?? 0) > 0;
        return value === "true" ? debt : !debt;
      },
    }
  );

  const fields: FieldConfig[] = [
    { key: "code", label: "Code", required: true, placeholder: "FRN-001" },
    {
      key: "entity_type", label: "Type", showInTable: true,
      render: (val: any) => val === "physique" ? <Badge variant="outline">Physique</Badge> : <Badge variant="secondary">Morale</Badge>
    },
    { key: "name", label: "Raison sociale", required: true, placeholder: "Nom du fournisseur" },
    { key: "contact_name", label: "Contact", placeholder: "Nom du contact" },
    { key: "email", label: "Email", type: "email", placeholder: "email@fournisseur.ma" },
    { key: "phone", label: "Téléphone", placeholder: "+212..." },
    { key: "city", label: "Ville", placeholder: "Casablanca" },
    {
      key: "is_active", label: "Statut", showInTable: true,
      render: (val: any) => {
        const active = val !== false;
        return active ? (
          <Badge className="text-[10px] px-1.5 py-0 h-4 bg-success/10 text-success border-success/20 font-medium">Actif</Badge>
        ) : (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 font-medium">
            <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />Bloqué
          </Badge>
        );
      },
    },
    {
      key: "credit_limit", label: "Plafond crédit (MAD)", type: "number", placeholder: "50000", defaultValue: 0, showInTable: true,
      render: (val) => <span className="tabular-nums text-sm font-medium">{fmtNum(Number(val || 0))}</span>,
    },
    {
      key: "__total_purchases", label: "Total achats", showInTable: true,
      render: (_val, row) => <span className="tabular-nums text-sm font-semibold text-primary">{fmtNum(stats[row.id]?.totalPurchases ?? 0)}</span>,
    } as any,
    {
      key: "__debt", label: "Encours", showInTable: true,
      render: (_val, row) => {
        const debt = stats[row.id]?.outstandingDebt ?? 0;
        const limit = Number(row.credit_limit || 0);
        const overLimit = limit > 0 && debt > limit;
        return (
          <div className="flex items-center gap-1.5">
            <span className={`tabular-nums text-sm font-semibold ${overLimit ? "text-destructive" : debt > 0 ? "text-warning" : "text-muted-foreground"}`}>{fmtNum(debt)}</span>
            {overLimit && <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4"><AlertCircle className="h-2.5 w-2.5 mr-0.5" />Dépassé</Badge>}
          </div>
        );
      },
    } as any,
    {
      key: "payment_terms", label: "Conditions de paiement", type: "select", defaultValue: "30j",
      options: [{ value: "30j", label: "30 jours" }, { value: "60j", label: "60 jours" }, { value: "90j", label: "90 jours" }],
      showInTable: true,
      render: (val: any) => {
        const map: Record<string, string> = { "30j": "30 jours", "60j": "60 jours", "90j": "90 jours" };
        return <span className="text-sm text-muted-foreground">{map[val] ?? val ?? "—"}</span>;
      },
    },
    { key: "notes", label: "Notes", type: "textarea", showInTable: false },
  ];

  const openDetail = (item: Supplier) => { setDetailItem(item); setIsNew(false); setDetailOpen(true); };

  const handleSave = async (formData: Record<string, any>) => {
    if (isNew) return await create(formData as Partial<Supplier>);
    if (detailItem) return await update(detailItem.id, formData as Partial<Supplier>);
    return false;
  };

  const handleSearch = useCallback((state: typeof searchState) => { setSearchState(state); }, []);

  const handleDuplicate = (supplier: any) => {
    const { id, created_at, updated_at, ...rest } = supplier;
    setDetailItem({
      ...rest,
      id: "",
      code: `${supplier.code}-COPIE`,
      name: `${supplier.name} (copie)`,
    } as any);
    setIsNew(true);
    setDetailOpen(true);
    toast.success("Fournisseur dupliqué localement. Cliquez sur enregistrer pour confirmer.");
  };

  const handleExport = () => {
    const formatted = excelExport.formatSuppliersForExport(filtered);
    excelExport.exportToExcel(formatted, "Liste_Fournisseurs", "Fournisseurs");
    toast.success("Export Excel généré avec succès");
  };

  return (
    <AppLayout title="Fournisseurs" subtitle="Gestion des fournisseurs">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <ViewToggle view={view} onChange={setView} />
            {can("EXPORT", "suppliers") && (
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1.5"
                onClick={handleExport}
              >
                <Download className="h-4 w-4" /> Exporter
              </Button>
            )}
            {can("CREATE", "suppliers") && (
              <>
                <SupplierImport onImportDone={fetch} companyId={companyId} />
                <Button onClick={() => { setIsNew(true); setDetailItem(null); setDetailOpen(true); }} className="gap-2">
                  <Plus className="h-4 w-4" /> Nouveau fournisseur
                </Button>
              </>
            )}
          </div>
        </div>
        <AdvancedSearch
          searchFields={SEARCH_FIELDS}
          filters={FILTERS}
          quickFilters={QUICK_FILTERS}
          onSearch={handleSearch}
          placeholder="Rechercher par nom, ICE, téléphone, email, ville..."
        />

        {view === "list" ? (
          <MasterDataPage
            title="Fournisseur"
            icon={<Truck className="h-8 w-8" />}
            data={filtered}
            loading={loading || statsLoading}
            fields={fields}
            onCreate={create}
            onUpdate={update}
            onDelete={remove}
            canCreate={false}
            canUpdate={can("UPDATE", "suppliers")}
            canDelete={can("DELETE", "suppliers")}
            onRowClick={openDetail}
            renderExtraActions={(s) => (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDuplicate(s);
                }}
                title="Dupliquer"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            )}
          />
        ) : (
          <SupplierKanban suppliers={filtered} stats={stats} onView={openDetail} />
        )}
      </div>

      <TierDetailDialog
        key={detailItem?.id || (isNew ? "new" : "none")}
        open={detailOpen}
        onOpenChange={(v) => { setDetailOpen(v); if (!v) { setDetailItem(null); setIsNew(false); } }}
        item={detailItem as any}
        isNew={isNew}
        type="supplier"
        onSave={handleSave}
      />
    </AppLayout>
  );
}
