import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/EmptyState";
import { Plus, Search, Edit, Trash2, Loader2 } from "lucide-react";
import { ReactNode } from "react";

export interface FieldConfig {
  key: string;
  label: string;
  type?: "text" | "number" | "email" | "select" | "textarea";
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  showInTable?: boolean;
  defaultValue?: string | number;
  render?: (value: any, row: any) => ReactNode;
}

interface MasterDataPageProps<T> {
  title: string;
  icon: ReactNode;
  data: T[];
  loading: boolean;
  fields: FieldConfig[];
  onCreate: (record: Partial<T>) => Promise<boolean>;
  onUpdate: (id: string, record: Partial<T>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  extraActions?: ReactNode;
  onRowClick?: (row: T) => void;
}

export function MasterDataPage<T extends { id: string }>({
  title,
  icon,
  data,
  loading,
  fields,
  onCreate,
  onUpdate,
  onDelete,
  canCreate = true,
  canUpdate = true,
  canDelete = true,
  extraActions,
  onRowClick,
}: MasterDataPageProps<T>) {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const tableFields = fields.filter((f) => f.showInTable !== false);

  const filtered = data.filter((row: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return fields.some((f) => {
      const val = row[f.key];
      return val && String(val).toLowerCase().includes(s);
    });
  });

  const openCreate = () => {
    const defaults: Record<string, any> = {};
    fields.forEach((f) => {
      if (f.defaultValue !== undefined) defaults[f.key] = f.defaultValue;
    });
    setForm(defaults);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (row: any) => {
    const values: Record<string, any> = {};
    fields.forEach((f) => { values[f.key] = row[f.key] ?? ""; });
    setForm(values);
    setEditingId(row.id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const ok = editingId
      ? await onUpdate(editingId, form as unknown as Partial<T>)
      : await onCreate(form as unknown as Partial<T>);
    setSaving(false);
    if (ok) setDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (data.length === 0 && !search) {
    return (
      <>
        <EmptyState
          icon={icon}
          title={`Aucun enregistrement`}
          description={`Ajoutez votre premier enregistrement pour commencer.`}
          actionLabel={canCreate ? "Ajouter" : undefined}
          onAction={canCreate ? openCreate : undefined}
        />
        {renderDialog()}
      </>
    );
  }

  function renderDialog() {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[90vw] md:max-w-[70vw] lg:max-w-[65vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier" : "Nouveau"} {title}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map((f) => (
              <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
                <Label htmlFor={f.key}>{f.label}{f.required && " *"}</Label>
                {f.type === "select" ? (
                  <select
                    id={f.key}
                    value={form[f.key] || ""}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Sélectionner...</option>
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    id={f.key}
                    value={form[f.key] || ""}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    rows={3}
                  />
                ) : (
                  <Input
                    id={f.key}
                    type={f.type || "text"}
                    value={form[f.key] || ""}
                    onChange={(e) => setForm({ ...form, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value })}
                    placeholder={f.placeholder}
                    required={f.required}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingId ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-64"
          />
        </div>
        <div className="flex items-center gap-2">
          {extraActions}
          {canCreate && (
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          )}
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {tableFields.map((f) => (
                <TableHead key={f.key}>{f.label}</TableHead>
              ))}
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row: any, i) => (
              <TableRow key={row.id} className={`cursor-pointer hover:bg-muted/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/20"}`} onClick={() => onRowClick ? onRowClick(row) : openEdit(row)}>
                {tableFields.map((f) => (
                  <TableCell key={f.key}>
                    {f.render ? f.render(row[f.key], row) : (
                      f.type === "number"
                        ? Number(row[f.key] || 0).toLocaleString("fr-MA")
                        : String(row[f.key] || "—")
                    )}
                  </TableCell>
                ))}
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => onDelete(row.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Aucun résultat.</p>
        )}
      </div>

      {renderDialog()}
    </div>
  );
}
