import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductCategory } from "@/hooks/useProductCategories";

interface CategoryDropdownsProps {
  /** The currently selected category_id (lowest level) */
  value: string | null;
  onChange: (id: string | null) => void;
  /** Flat list of ALL categories */
  categories: ProductCategory[];
  disabled?: boolean;
}

const NONE = "__none__";

/**
 * 3 cascading selects:
 *  L1 – root categories (parent_id IS NULL)
 *  L2 – children of selected L1 (hidden if L1 has no children)
 *  L3 – children of selected L2 (hidden if L2 has no children)
 *
 * The stored value is always the deepest selected id.
 */
export function CategoryDropdowns({
  value,
  onChange,
  categories,
  disabled = false,
}: CategoryDropdownsProps) {
  // Resolve selected chain from the stored value
  const chain = useMemo<[ProductCategory | null, ProductCategory | null, ProductCategory | null]>(() => {
    if (!value) return [null, null, null];

    const selected = categories.find((c) => c.id === value) ?? null;
    if (!selected) return [null, null, null];

    if (selected.level === 1) return [selected, null, null];
    if (selected.level === 2) {
      const parent = categories.find((c) => c.id === selected.parent_id) ?? null;
      return [parent, selected, null];
    }
    // level 3
    const l2 = categories.find((c) => c.id === selected.parent_id) ?? null;
    const l1 = l2 ? categories.find((c) => c.id === l2.parent_id) ?? null : null;
    return [l1, l2, selected];
  }, [value, categories]);

  const [l1, l2, l3] = chain;

  // Lists per level
  const l1List = useMemo(
    () => categories.filter((c) => c.parent_id === null && c.is_active).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [categories]
  );
  const l2List = useMemo(
    () => l1 ? categories.filter((c) => c.parent_id === l1.id && c.is_active).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)) : [],
    [categories, l1]
  );
  const l3List = useMemo(
    () => l2 ? categories.filter((c) => c.parent_id === l2.id && c.is_active).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)) : [],
    [categories, l2]
  );

  const hasL2 = l2List.length > 0;
  const hasL3 = l3List.length > 0;

  // Handlers
  const handleL1 = (id: string) => {
    if (id === NONE) { onChange(null); return; }
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;
    // Check if this L1 has children — if so, don't commit yet (user must pick deeper)
    const children = categories.filter((c) => c.parent_id === id && c.is_active);
    if (children.length === 0) {
      onChange(id); // leaf — commit
    } else {
      onChange(id); // still commit so the next level appears
    }
  };

  const handleL2 = (id: string) => {
    if (id === NONE) {
      // Deselect L2 → revert to L1
      onChange(l1?.id ?? null);
      return;
    }
    const children = categories.filter((c) => c.parent_id === id && c.is_active);
    onChange(id); // commit L2 (and L3 will appear if children exist)
    void children; // children presence handled via l3List
  };

  const handleL3 = (id: string) => {
    if (id === NONE) {
      onChange(l2?.id ?? null);
      return;
    }
    onChange(id);
  };

  return (
    <div className="space-y-3">
      {/* Level 1 */}
      <div>
        <Label className="text-xs text-muted-foreground">Catégorie principale</Label>
        <Select
          value={l1?.id ?? NONE}
          onValueChange={handleL1}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="— Aucune catégorie —" />
          </SelectTrigger>
          <SelectContent className="z-[200]">
            <SelectItem value={NONE}>— Aucune catégorie —</SelectItem>
            {l1List.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
                {c.code ? ` (${c.code})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Level 2 — only if L1 selected AND has children */}
      {l1 && hasL2 && (
        <div>
          <Label className="text-xs text-muted-foreground">Sous-catégorie</Label>
          <Select
            value={l2?.id ?? NONE}
            onValueChange={handleL2}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="— Toutes les sous-catégories —" />
            </SelectTrigger>
            <SelectContent className="z-[200]">
              <SelectItem value={NONE}>— Toutes les sous-catégories —</SelectItem>
              {l2List.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {c.code ? ` (${c.code})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Level 3 — only if L2 selected AND has children */}
      {l2 && hasL3 && (
        <div>
          <Label className="text-xs text-muted-foreground">Sous-sous-catégorie</Label>
          <Select
            value={l3?.id ?? NONE}
            onValueChange={handleL3}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="— Toutes —" />
            </SelectTrigger>
            <SelectContent className="z-[200]">
              <SelectItem value={NONE}>— Toutes —</SelectItem>
              {l3List.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {c.code ? ` (${c.code})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Helper text showing resolved path */}
      {value && (
        <p className="text-xs text-muted-foreground">
          Catégorie sélectionnée :{" "}
          <span className="text-foreground font-medium">
            {[l1?.name, l2?.name, l3?.name].filter(Boolean).join(" › ")}
          </span>
        </p>
      )}
    </div>
  );
}
