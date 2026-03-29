import { useState, useMemo } from "react";
import { useExpenses, Expense } from "@/hooks/useExpenses";
import { ExpenseFormDialog } from "./ExpenseFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Search, Pencil, Trash2, CheckCircle2, XCircle, TrendingDown,
  Loader2, CreditCard,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { EXPENSE_STATUS, getStatus } from "@/lib/status-config";

const METHOD_LABELS: Record<string, string> = {
  transfer: "Virement",
  cheque:   "Chèque",
  cash:     "Espèces",
  card:     "Carte",
  lcn:      "LCN",
};

function fmt(n: number) {
  return Number(n).toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function ExpenseList() {
  const { expenses, loading, create, update, remove } = useExpenses();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Unique categories from loaded expenses
  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>();
    expenses.forEach(e => {
      if (e.category_id && e.category?.name) map.set(e.category_id, e.category.name);
    });
    return Array.from(map.entries());
  }, [expenses]);

  const filtered = useMemo(() => {
    return expenses.filter(e => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        e.description.toLowerCase().includes(q) ||
        e.expense_number.toLowerCase().includes(q) ||
        e.supplier?.name?.toLowerCase().includes(q) ||
        false;
      const matchStatus = statusFilter === "all" || e.payment_status === statusFilter;
      const matchCat = categoryFilter === "all" || e.category_id === categoryFilter;
      return matchSearch && matchStatus && matchCat;
    });
  }, [expenses, search, statusFilter, categoryFilter]);

  // Totals for filtered set
  const totals = useMemo(() => ({
    ht:  filtered.reduce((s, e) => s + Number(e.amount_ht), 0),
    tva: filtered.reduce((s, e) => s + Number(e.amount_tva), 0),
    ttc: filtered.reduce((s, e) => s + Number(e.amount_ttc), 0),
    paid: filtered.filter(e => e.payment_status === "paid").reduce((s, e) => s + Number(e.amount_ttc), 0),
    pending: filtered.filter(e => e.payment_status === "pending").reduce((s, e) => s + Number(e.amount_ttc), 0),
  }), [filtered]);

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (e: Expense) => { setEditing(e); setFormOpen(true); };

  const handleSave = async (values: Partial<Expense>) => {
    if (editing) return update(editing.id, values);
    return create(values);
  };

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total TTC" value={`${fmt(totals.ttc)} MAD`} color="text-foreground" />
        <KpiCard label="Total HT" value={`${fmt(totals.ht)} MAD`} color="text-muted-foreground" />
        <KpiCard label="Payé" value={`${fmt(totals.paid)} MAD`} color="text-green-600" />
        <KpiCard label="En attente" value={`${fmt(totals.pending)} MAD`} color="text-amber-600" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-1 min-w-0">
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="paid">Payé</SelectItem>
              <SelectItem value="cancelled">Annulé</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {categoryOptions.map(([id, name]) => (
                <SelectItem key={id} value={id}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> Nouvelle dépense
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>N°</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Fournisseur</TableHead>
              <TableHead className="text-right">Montant TTC</TableHead>
              <TableHead>Paiement</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-center w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                  <TrendingDown className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>Aucune dépense trouvée</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={openNew}>
                    <Plus className="h-4 w-4 mr-1" /> Créer une dépense
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(exp => {
                const sc = getStatus(EXPENSE_STATUS, exp.payment_status);
                return (
                  <TableRow key={exp.id} className="hover:bg-muted/40">
                    <TableCell className="font-mono text-xs text-muted-foreground">{exp.expense_number}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(exp.expense_date), "dd/MM/yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate font-medium text-sm">{exp.description}</TableCell>
                    <TableCell>
                      {exp.category ? (
                        <span className="flex items-center gap-1.5 text-xs">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: exp.category.color }} />
                          {exp.category.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {exp.supplier?.name || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm">
                      {fmt(exp.amount_ttc)}
                      <span className="text-xs text-muted-foreground ml-1">MAD</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {exp.payment_method ? METHOD_LABELS[exp.payment_method] : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${sc.className} border-0 text-[11px]`}>
                        {sc.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(exp)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(exp)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer totals */}
      {filtered.length > 0 && (
        <div className="flex justify-end gap-6 px-1 text-sm text-muted-foreground">
          <span>{filtered.length} dépense{filtered.length > 1 ? "s" : ""}</span>
          <span>HT: <strong className="text-foreground">{fmt(totals.ht)} MAD</strong></span>
          <span>TVA: <strong className="text-foreground">{fmt(totals.tva)} MAD</strong></span>
          <span>TTC: <strong className="text-foreground text-base">{fmt(totals.ttc)} MAD</strong></span>
        </div>
      )}

      {/* Form dialog */}
      <ExpenseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        expense={editing}
        onSave={handleSave}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la dépense ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.description} — {fmt(deleteTarget?.amount_ttc || 0)} MAD
              {deleteTarget?.payment_status === "paid" && (
                <span className="block mt-2 text-warning-foreground font-medium">
                  ⚠️ Cette dépense est marquée comme payée. La suppression inversera l'impact sur la trésorerie.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => { if (deleteTarget) { await remove(deleteTarget.id); setDeleteTarget(null); } }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}
