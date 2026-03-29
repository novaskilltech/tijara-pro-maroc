import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface ProductCategory {
  id: string;
  name: string;
  code: string | null;
  parent_id: string | null;
  level: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // computed
  children?: ProductCategory[];
  parent?: ProductCategory | null;
}

export interface CategoryTreeNode extends ProductCategory {
  children: CategoryTreeNode[];
  fullPath: string; // "Matières premières > Métaux > Acier"
}

function buildTree(
  categories: ProductCategory[],
  parentId: string | null = null,
  pathPrefix = ""
): CategoryTreeNode[] {
  return categories
    .filter((c) => c.parent_id === parentId && c.is_active)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
    .map((c) => {
      const fullPath = pathPrefix ? `${pathPrefix} > ${c.name}` : c.name;
      return {
        ...c,
        fullPath,
        children: buildTree(categories, c.id, fullPath),
      };
    });
}

/** Flatten tree into a list for select dropdowns */
export function flattenTree(nodes: CategoryTreeNode[]): CategoryTreeNode[] {
  const result: CategoryTreeNode[] = [];
  for (const node of nodes) {
    result.push(node);
    result.push(...flattenTree(node.children));
  }
  return result;
}

export function useProductCategories() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [flatList, setFlatList] = useState<CategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("product_categories")
      .select("*")
      .order("level")
      .order("sort_order")
      .order("name");
    setLoading(false);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    const cats: ProductCategory[] = data || [];
    setCategories(cats);
    const t = buildTree(cats);
    setTree(t);
    setFlatList(flattenTree(t));
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const createCategory = async (record: Partial<ProductCategory>) => {
    // Auto-compute level based on parent
    let level = 1;
    if (record.parent_id) {
      const parent = categories.find((c) => c.id === record.parent_id);
      level = parent ? parent.level + 1 : 1;
    }
    if (level > 3) {
      toast({ title: "Maximum 3 niveaux de catégories", variant: "destructive" });
      return null;
    }
    const { data, error } = await (supabase as any)
      .from("product_categories")
      .insert({ ...record, level })
      .select()
      .single();
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return null;
    }
    toast({ title: "Catégorie créée" });
    await fetchCategories();
    return data;
  };

  const updateCategory = async (id: string, record: Partial<ProductCategory>) => {
    const { error } = await (supabase as any)
      .from("product_categories")
      .update(record)
      .eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Catégorie mise à jour" });
    await fetchCategories();
    return true;
  };

  const deleteCategory = async (id: string) => {
    // Check if any products reference this category
    const { count: productCount } = await (supabase as any)
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category_id", id);
    if ((productCount ?? 0) > 0) {
      toast({
        title: "Impossible de supprimer",
        description: `${productCount} produit(s) utilisent cette catégorie.`,
        variant: "destructive",
      });
      return false;
    }
    // Check if it has child categories
    const { count: childCount } = await (supabase as any)
      .from("product_categories")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", id);
    if ((childCount ?? 0) > 0) {
      toast({
        title: "Impossible de supprimer",
        description: `Cette catégorie contient ${childCount} sous-catégorie(s). Supprimez-les d'abord.`,
        variant: "destructive",
      });
      return false;
    }
    const { error } = await (supabase as any)
      .from("product_categories")
      .delete()
      .eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Catégorie supprimée" });
    await fetchCategories();
    return true;
  };

  return {
    categories,
    tree,
    flatList,
    loading,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
