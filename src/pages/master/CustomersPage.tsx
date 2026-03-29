import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { MasterDataPage, FieldConfig } from "@/components/MasterDataPage";
import { CustomerKanban } from "@/components/master/CustomerKanban";
import { TierDetailDialog } from "@/components/master/TierDetailDialog";
import { ViewToggle } from "@/components/ViewToggle";
import { AdvancedSearch, applyAdvancedSearch, type SearchOperator, type SearchableField, type FilterOption, type QuickFilter } from "@/components/AdvancedSearch";
import { useCrud } from "@/hooks/useCrud";
import { useCompany } from "@/hooks/useCompany";
import { supabase } from "@/integrations/supabase/client";
import { Users, Plus } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Customer {
  id: string;
  code: string;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  phone2: string;
  city: string;
  ice: string;
  rc: string;
  if_number: string;
  patente: string;
  address: string;
  payment_terms: string;
  credit_limit: number;
  is_active: boolean;
  bank_name: string;
  rib: string;
  account_number: string;
  iban: string;
  swift: string;
  fax: string;
  notes: string;
}

const SEARCH_FIELDS: SearchableField[] = [
  { key: "name", label: "Nom" },
  { key: "ice", label: "ICE" },
  { key: "phone", label: "Téléphone" },
  { key: "email", label: "Email" },
  { key: "city", label: "Ville" },
  { key: "code", label: "Code" },
];

const FILTERS: FilterOption[] = [
  {
    key: "is_active",
    label: "Statut",
    type: "boolean",
    trueLabel: "Actif",
    falseLabel: "Bloqué",
  },
  {
    key: "has_unpaid",
    label: "Impayés",
    type: "boolean",
    trueLabel: "Oui",
    falseLabel: "Non",
  },
  {
    key: "payment_terms",
    label: "Conditions paiement",
    type: "select",
    options: [
      { value: "comptant", label: "Comptant" },
      { value: "30j", label: "30 jours" },
      { value: "60j", label: "60 jours" },
      { value: "90j", label: "90 jours" },
    ],
  },
];

const QUICK_FILTERS: QuickFilter[] = [
  { label: "Actifs uniquement", filters: { is_active: "true" } },
  { label: "Avec impayés", filters: { has_unpaid: "true" } },
  { label: "Bloqués", filters: { is_active: "false" } },
];

const fields: FieldConfig[] = [
  { key: "code", label: "Code", required: true, placeholder: "CLI-001" },
  { key: "name", label: "Raison sociale", required: true, placeholder: "Nom de l'entreprise" },
  { key: "contact_name", label: "Contact", placeholder: "Nom du contact" },
  { key: "email", label: "Email", type: "email", placeholder: "email@entreprise.ma" },
  { key: "phone", label: "Téléphone", placeholder: "+212..." },
  { key: "city", label: "Ville", placeholder: "Casablanca" },
  {
    key: "is_active",
    label: "Statut",
    showInTable: true,
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
  { key: "ice", label: "ICE", showInTable: false },
  { key: "payment_terms", label: "Conditions de paiement", type: "select", defaultValue: "30j", options: [
    { value: "comptant", label: "Comptant" },
    { value: "30j", label: "30 jours" },
    { value: "60j", label: "60 jours" },
    { value: "90j", label: "90 jours" },
  ], showInTable: false },
  { key: "credit_limit", label: "Plafond crédit (MAD)", type: "number", defaultValue: 0, showInTable: false },
  { key: "notes", label: "Notes", type: "textarea", showInTable: false },
];

export default function CustomersPage() {
  const { data, loading, create, update, remove } = useCrud<Customer>({ table: "customers", orderBy: "code", ascending: true, companyScoped: true });
  const { activeCompany } = useCompany();
  const { can } = usePermissions();
  const [view, setView] = useState<"list" | "kanban">("list");
  const [stats, setStats] = useState<Record<string, { outstandingReceivable: number }>>({});
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<Customer | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Search state
  const [searchState, setSearchState] = useState<{
    query: string;
    operator: SearchOperator;
    activeFilters: Record<string, string>;
  }>({ query: "", operator: "contains", activeFilters: {} });

  const fetchStats = useCallback(async () => {
    if (!data.length) return;
    let query = (supabase as any)
      .from("invoices")
      .select("customer_id, remaining_balance")
      .eq("invoice_type", "client")
      .in("status", ["validated", "paid"]);
    if (activeCompany?.id) query = query.eq("company_id", activeCompany.id);
    const { data: invoices } = await query;
    const map: Record<string, { outstandingReceivable: number }> = {};
    (invoices || []).forEach((inv: any) => {
      if (!inv.customer_id) return;
      if (!map[inv.customer_id]) map[inv.customer_id] = { outstandingReceivable: 0 };
      map[inv.customer_id].outstandingReceivable += Number(inv.remaining_balance);
    });
    setStats(map);
  }, [data, activeCompany?.id]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const filtered = applyAdvancedSearch(
    data,
    SEARCH_FIELDS.map((f) => f.key),
    searchState.query,
    searchState.operator,
    searchState.activeFilters,
    {
      is_active: (item, value) => String(item.is_active !== false) === value,
      has_unpaid: (item, value) => {
        const unpaid = (stats[item.id]?.outstandingReceivable ?? 0) > 0;
        return value === "true" ? unpaid : !unpaid;
      },
    }
  );

  const openDetail = (item: Customer) => {
    setDetailItem(item);
    setIsNew(false);
    setDetailOpen(true);
  };

  const handleSave = async (formData: Record<string, any>) => {
    if (isNew) return await create(formData as Partial<Customer>);
    if (detailItem) return await update(detailItem.id, formData as Partial<Customer>);
    return false;
  };

  const handleSearch = useCallback((state: typeof searchState) => {
    setSearchState(state);
  }, []);

  return (
    <AppLayout title="Clients" subtitle="Gestion du portefeuille clients">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <ViewToggle view={view} onChange={setView} />
            {can("CREATE", "customers") && (
              <Button onClick={() => { setIsNew(true); setDetailItem(null); setDetailOpen(true); }} className="gap-2">
                <Plus className="h-4 w-4" /> Nouveau client
              </Button>
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
            title="Client"
            icon={<Users className="h-8 w-8" />}
            data={filtered}
            loading={loading}
            fields={fields}
            onCreate={create}
            onUpdate={update}
            onDelete={remove}
            canCreate={false}
            canUpdate={can("UPDATE", "customers")}
            canDelete={can("DELETE", "customers")}
            onRowClick={openDetail}
          />
        ) : (
          <CustomerKanban
            customers={filtered}
            stats={stats}
            onView={openDetail}
          />
        )}
      </div>

      <TierDetailDialog
        open={detailOpen}
        onOpenChange={(v) => { setDetailOpen(v); if (!v) { setDetailItem(null); setIsNew(false); } }}
        item={detailItem as any}
        isNew={isNew}
        type="client"
        onSave={handleSave}
      />
    </AppLayout>
  );
}
