import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useProductCategories, ProductCategory, CategoryTreeNode } from "@/hooks/useProductCategories";
import {
  Loader2,
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Tree Node Component                                                  */
/* ------------------------------------------------------------------ */
function CategoryNode({
  node,
  depth,
  onEdit,
  onDelete,
  onAddChild,
}: {
  node: CategoryTreeNode;
  depth: number;
  onEdit: (cat: ProductCategory) => void;
  onDelete: (cat: ProductCategory) => void;
  onAddChild: (parentId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const canAddChild = depth < 2; // max 3 levels (0, 1, 2)

  const levelColors = [
    "text-primary font-semibold",
    "text-foreground font-medium",
    "text-muted-foreground",
  ];

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg group hover:bg-muted/50 transition-colors",
          depth === 0 && "mt-1"
        )}
        style={{ paddingLeft: `${12 + depth * 24}px` }}
      >
        {/* Expand toggle */}
        <button
          className="shrink-0 text-muted-foreground hover:text-foreground w-4"
          onClick={() => setExpanded(!expanded)}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )
          ) : (
            <span className="w-3.5 inline-block" />
          )}
        </button>

        {/* Folder icon */}
        {hasChildren ? (
          <FolderOpen className={cn("h-4 w-4 shrink-0", depth === 0 ? "text-primary" : "text-muted-foreground")} />
        ) : (
          <Folder className="h-4 w-4 shrink-0 text-muted-foreground/60" />
        )}

        {/* Name */}
        <span className={cn("flex-1 text-sm truncate", levelColors[depth] || "text-foreground")}>
          {node.name}
        </span>

        {/* Code badge */}
        {node.code && (
          <Badge variant="outline" className="text-xs font-mono hidden sm:inline-flex">
            {node.code}
          </Badge>
        )}

        {/* Level badge */}
        <Badge
          variant="secondary"
          className="text-xs shrink-0 hidden md:inline-flex"
        >
          {depth === 0 ? "Principale" : depth === 1 ? "Sous-cat." : "Sous-sous-cat."}
        </Badge>

        {/* Status */}
        {!node.is_active && (
          <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">
            Inactif
          </Badge>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {canAddChild && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Ajouter une sous-catégorie"
              onClick={() => onAddChild(node.id)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              const { children, fullPath, ...catOnly } = node;
              onEdit(catOnly as ProductCategory);
            }}
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(node)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div className="border-l border-border/50 ml-[29px]">
          {node.children.map((child) => (
            <CategoryNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Category Form Dialog                                                 */
/* ------------------------------------------------------------------ */
interface CategoryFormState {
  name: string;
  code: string;
  parent_id: string | null;
  is_active: boolean;
  sort_order: number;
}

const defaultForm: CategoryFormState = {
  name: "",
  code: "",
  parent_id: null,
  is_active: true,
  sort_order: 0,
};

function CategoryFormDialog({
  open,
  onOpenChange,
  editing,
  defaultParentId,
  categories,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: ProductCategory | null;
  defaultParentId: string | null;
  categories: ProductCategory[];
  onSave: (data: Partial<ProductCategory>) => Promise<any>;
}) {
  const [form, setForm] = useState<CategoryFormState>({ ...defaultForm });
  const [saving, setSaving] = useState(false);

  // Sync form whenever dialog opens or editing target changes
  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          name: editing.name,
          code: editing.code || "",
          parent_id: editing.parent_id,
          is_active: editing.is_active,
          sort_order: editing.sort_order,
        });
      } else {
        setForm({ ...defaultForm, parent_id: defaultParentId });
      }
    }
  }, [open, editing?.id, defaultParentId]);

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setForm({ ...defaultForm });
      // Important: if we're closing, also clear editing state in parent 
      // but wait for animation if needed, or just clear it here if possible.
      // Actually, CategoriesPage manages formOpen and editing separately.
    }
    onOpenChange(v);
  };

  // Only allow parents that would result in level <= 3
  // A root category is level 1, so its children are level 2, grandchildren are level 3
  // When editing, exclude self and descendants
  const editingId = editing?.id;
  const parentOptions = categories.filter((c) => {
    if (editingId && (c.id === editingId)) return false;
    return c.level <= 2; // can be parent only if level 1 or 2
  });

  const selectedParent = parentOptions.find((c) => c.id === form.parent_id);
  const computedLevel = selectedParent ? selectedParent.level + 1 : 1;

  const levelLabel = computedLevel === 1 ? "Catégorie principale" : computedLevel === 2 ? "Sous-catégorie (Niv. 1)" : "Sous-sous-catégorie (Niv. 2)";

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await onSave({
      name: form.name.trim(),
      code: form.code.trim() || null,
      parent_id: form.parent_id || null,
      is_active: form.is_active,
      sort_order: form.sort_order,
    });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Modifier la catégorie" : "Nouvelle catégorie"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Parent selector */}
          <div>
            <Label>Catégorie parente</Label>
            <Select
              value={form.parent_id || "__root__"}
              onValueChange={(v) =>
                setForm((prev) => ({ ...prev, parent_id: v === "__root__" ? null : v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="— Catégorie principale —" />
              </SelectTrigger>
              <SelectContent className="z-[200]">
                <SelectItem value="__root__">— Catégorie principale —</SelectItem>
                {parentOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {"  ".repeat(c.level - 1)}{c.name}
                    {c.code ? ` (${c.code})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Niveau résultant : <span className="font-medium text-foreground">{levelLabel}</span>
            </p>
          </div>

          {/* Name */}
          <div>
            <Label htmlFor="cat-name">Nom *</Label>
            <Input
              id="cat-name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ex: Matières premières"
              autoFocus
            />
          </div>

          {/* Code */}
          <div>
            <Label htmlFor="cat-code">Code</Label>
            <Input
              id="cat-code"
              value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
              placeholder="Ex: MAT"
              className="font-mono"
            />
          </div>

          {/* Sort order */}
          <div>
            <Label htmlFor="cat-sort">Ordre d'affichage</Label>
            <Input
              id="cat-sort"
              type="number"
              value={form.sort_order}
              onChange={(e) =>
                setForm((p) => ({ ...p, sort_order: Number(e.target.value) }))
              }
            />
          </div>

          {/* Active */}
          <div className="flex items-center justify-between py-1">
            <Label htmlFor="cat-active" className="cursor-pointer">Catégorie active</Label>
            <Switch
              id="cat-active"
              checked={form.is_active}
              onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {editing ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Main Page                                                            */
/* ------------------------------------------------------------------ */
export default function CategoriesPage() {
  const { categories, tree, loading, createCategory, updateCategory, deleteCategory } =
    useProductCategories();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductCategory | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductCategory | null>(null);

  const openCreate = (parentId: string | null = null) => {
    setEditing(null);
    setDefaultParentId(parentId);
    setFormOpen(true);
  };

  const openEdit = (cat: ProductCategory) => {
    // Ensure we don't carry over temporary tree properties
    const { children, ...baseCat } = cat as any;
    setEditing({ ...baseCat });
    setDefaultParentId(null);
    setFormOpen(true);
  };

  const handleCloseForm = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      // Clear editing state after a short delay to allow dialog close animation
      setTimeout(() => setEditing(null), 200);
    }
  };

  const handleSave = async (data: Partial<ProductCategory>) => {
    if (editing) {
      await updateCategory(editing.id, data);
    } else {
      await createCategory(data);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteCategory(deleteTarget.id);
    setDeleteTarget(null);
  };

  const totalActive = categories.filter((c) => c.is_active).length;

  return (
    <AppLayout
      title="Catégories de produits"
      subtitle="Gérez la hiérarchie des catégories (jusqu'à 3 niveaux)"
    >
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Tag className="h-4 w-4" />
            <span>
              <span className="font-medium text-foreground">{totalActive}</span> catégorie(s) active(s)
            </span>
          </div>
          <Button onClick={() => openCreate(null)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nouvelle catégorie
          </Button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
          <div className="flex items-center gap-1.5">
            <FolderOpen className="h-3.5 w-3.5 text-primary" />
            <span>Catégorie principale</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Folder className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Sous-catégorie</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            <span>Ajouter sous-catégorie (survol)</span>
          </div>
        </div>

        {/* Tree */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : tree.length === 0 ? (
          <EmptyState
            icon={<Tag className="h-8 w-8" />}
            title="Aucune catégorie"
            description="Créez votre première catégorie principale."
            actionLabel="Nouvelle catégorie"
            onAction={() => openCreate(null)}
          />
        ) : (
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="px-3 py-3 border-b border-border bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Arborescence des catégories
              </p>
            </div>
            <div className="p-2">
              {tree.map((node) => (
                <CategoryNode
                  key={node.id}
                  node={node}
                  depth={0}
                  onEdit={openEdit}
                  onDelete={(cat) => setDeleteTarget(cat)}
                  onAddChild={(parentId) => openCreate(parentId)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <CategoryFormDialog
        key={editing?.id || "new-category"}
        open={formOpen}
        onOpenChange={handleCloseForm}
        editing={editing}
        defaultParentId={defaultParentId}
        categories={categories}
        onSave={handleSave}
      />

      {/* Delete Confirm Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la catégorie ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous allez supprimer{" "}
              <span className="font-semibold">"{deleteTarget?.name}"</span>.
              Cette action est irréversible. Si des produits ou sous-catégories
              utilisent cette catégorie, la suppression sera bloquée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
