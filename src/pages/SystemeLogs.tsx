import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

interface AuditLog {
  id: string;
  action: string;
  table_name: string | null;
  record_id: string | null;
  details: string | null;
  user_id: string | null;
  created_at: string;
  user_name?: string;
}

const ACTION_LABELS: Record<string, string> = {
  validate_invoice: "Validation facture",
  cancel_invoice: "Annulation facture",
  create_payment: "Création paiement",
  create_credit_note: "Création avoir",
  reconcile_transaction: "Rapprochement",
  convert_quotation: "Conversion devis",
  cancel_quotation: "Annulation devis",
  validate_delivery: "Validation livraison",
  cancel_delivery: "Annulation livraison",
  create_reception: "Réception fournisseur",
  confirm_order: "Confirmation commande",
};

const TABLE_LABELS: Record<string, string> = {
  invoices: "Factures",
  payments: "Paiements",
  credit_notes: "Avoirs",
  bank_transactions: "Banque",
  user_roles: "Rôles",
  profiles: "Profils",
  quotations: "Devis",
  deliveries: "Livraisons",
  purchase_orders: "Commandes Achat",
  receptions: "Réceptions",
  purchase_requests: "Demandes Achat",
};

const SystemeLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterTable, setFilterTable] = useState("all");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);
  const { activeCompany } = useCompany();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let query = (supabase as any)
        .from("audit_logs")
        .select("*")
        .gte("created_at", dateFrom + "T00:00:00")
        .lte("created_at", dateTo + "T23:59:59")
        .order("created_at", { ascending: false })
        .limit(500);

      if (filterAction !== "all") query = query.eq("action", filterAction);
      if (filterTable !== "all") query = query.eq("table_name", filterTable);
      if (activeCompany?.id) query = query.eq("company_id", activeCompany.id);

      const { data, error } = await query;
      if (!error && data) {
        // Fetch user names for the logs
        const userIds = [...new Set((data as AuditLog[]).map((l) => l.user_id).filter(Boolean))];
        let profileMap = new Map<string, string>();
        if (userIds.length > 0) {
          const { data: profiles } = await (supabase as any)
            .from("profiles")
            .select("user_id, full_name, email")
            .in("user_id", userIds);
          (profiles || []).forEach((p: any) => profileMap.set(p.user_id, p.full_name || p.email));
        }
        setLogs((data as AuditLog[]).map((l) => ({ ...l, user_name: l.user_id ? profileMap.get(l.user_id) || "—" : "Système" })));
      }
      setLoading(false);
    };
    if (activeCompany?.id) fetch();
  }, [dateFrom, dateTo, filterAction, filterTable, activeCompany?.id]);

  const filtered = logs.filter((l) => {
    const q = search.toLowerCase();
    return (l.action || "").toLowerCase().includes(q) ||
      (l.details || "").toLowerCase().includes(q) ||
      (l.user_name || "").toLowerCase().includes(q) ||
      (l.record_id || "").toLowerCase().includes(q);
  });

  const uniqueActions = [...new Set(logs.map((l) => l.action))];
  const uniqueTables = [...new Set(logs.map((l) => l.table_name).filter(Boolean))];

  return (
    <AppLayout title="Logs d'activité" subtitle="Historique des actions et audit système">
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex items-end gap-4 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div>
            <Label>De</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <Label>À</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div>
            <Label>Action</Label>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {uniqueActions.map((a) => <SelectItem key={a} value={a}>{ACTION_LABELS[a] || a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Module</Label>
            <Select value={filterTable} onValueChange={setFilterTable}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {uniqueTables.map((t) => <SelectItem key={t!} value={t!}>{TABLE_LABELS[t!] || t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Détails</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun log trouvé</TableCell></TableRow>
              ) : filtered.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {new Date(log.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                  </TableCell>
                  <TableCell className="text-sm">{log.user_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{ACTION_LABELS[log.action] || log.action}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{TABLE_LABELS[log.table_name || ""] || log.table_name || "—"}</TableCell>
                  <TableCell className="text-sm max-w-[300px] truncate text-muted-foreground">{log.details || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
};

export default SystemeLogs;
