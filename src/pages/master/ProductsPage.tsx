import { useState, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useProducts, Product } from "@/hooks/useProducts";
import { ProductFormDialog } from "@/components/products/ProductFormDialog";
import { ProductImportExport } from "@/components/products/ProductImportExport";
import { usePermissions } from "@/hooks/usePermissions";
import { ProductKanban } from "@/components/master/ProductKanban";
import { ViewToggle } from "@/components/ViewToggle";
import { Package, Loader2, Plus, Edit, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";
import {
  AdvancedSearch,
  applyAdvancedSearch,
  type SearchOperator,
  type SearchableField,
  type FilterOption,
  type QuickFilter,
} from "@/components/AdvancedSearch";
import { formatCurrency } from "@/lib/format-currency";

const TYPE_LABELS: Record<string, string> = {
  stockable: "Stockable",
  consumable: "Consommable",
  service: "Service",
};

const SEARCH_FIELDS: SearchableField[] = [
  { key: "name", label: "Nom" },
  { key: "code", label: "Référence" },
  { key: "barcode", label: "Code-barres" },
  { key: "category", label: "Catégorie" },
];

const FILTERS: FilterOption[] = [
  {
    key: "product_type",
    label: "Type",
    type: "select",
    options: [
      { value: "stockable", label: "Stockable" },
      { value: "consumable", label: "Consommable" },
      { value: "service", label: "Service" },
    ],
  },
  {
    key: "is_active",
    label: "Statut",
    type: "boolean",
    trueLabel: "Actif",
    falseLabel: "Inactif",
  },
];

const QUICK_FILTERS: QuickFilter[] = [
  { label: "Actifs uniquement", filters: { is_active: "true" } },
  { label: "Stockables", filters: { product_type: "stockable" } },
  { label: "Services", filters: { product_type: "service" } },
];

export default function ProductsPage() {
  const { products, loading, fetchProducts, createProduct, updateProduct, deleteProduct, duplicateProduct } = useProducts();
  const { can } = usePermissions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [view, setView] = useState<"list" | "kanban">("list");

  // Search state
  const [searchState, setSearchState] = useState<{
    query: string;
    operator: SearchOperator;
    activeFilters: Record<string, string>;
  }>({ query: "", operator: "contains", activeFilters: {} });

  const openCreate = () => { setEditingProduct(null); setDialogOpen(true); };
  const openEdit = (p: Product) => { setEditingProduct(p); setDialogOpen(true); };

  const handleSave = async (data: Partial<Product>) => {
    // Check if we are truly editing (valid non-empty ID) or creating (empty or null ID)
    if (editingProduct && editingProduct.id && editingProduct.id.length > 5) {
      return await updateProduct(editingProduct.id, data);
    }
    // Create new product (including duplicates that have empty id)
    return await createProduct(data);
  };

  const handleSearch = useCallback((state: typeof searchState) => {
    setSearchState(state);
  }, []);

  const filtered = applyAdvancedSearch(
    products,
    SEARCH_FIELDS.map((f) => f.key),
    searchState.query,
    searchState.operator,
    searchState.activeFilters,
    {
      is_active: (item, value) => String(item.is_active !== false) === value,
    }
  );

  if (loading) {
    return (
      <AppLayout title="Produits & Services">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Produits & Services">
      <div className="space-y-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex-1" />
             <div className="flex items-center gap-2">
              <ViewToggle view={view} onChange={setView} />
              {can("EXPORT", "products") && (
                <ProductImportExport products={products} onImportDone={fetchProducts} />
              )}
              {can("CREATE", "products") && (
                <Button onClick={openCreate} className="gap-2">
                  <Plus className="h-4 w-4" /> Nouveau produit
                </Button>
              )}
            </div>
          </div>
          <AdvancedSearch
            searchFields={SEARCH_FIELDS}
            filters={FILTERS}
            quickFilters={QUICK_FILTERS}
            onSearch={handleSearch}
            placeholder="Rechercher par nom, code, catégorie..."
          />
        </div>

        {products.length === 0 && !searchState.query ? (
          <EmptyState icon={<Package className="h-8 w-8" />} title="Aucun produit" description="Ajoutez votre premier produit." actionLabel="Ajouter" onAction={openCreate} />
        ) : view === "kanban" ? (
          <ProductKanban
            products={filtered}
            onView={(p) => { setEditingProduct(p); setDialogOpen(true); }}
            onEdit={(p) => { setEditingProduct(p); setDialogOpen(true); }}
          />
        ) : (
          <div className="bg-card rounded-lg border border-border shadow-card overflow-x-auto whitespace-nowrap md:whitespace-normal">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                   <TableHead className="w-12">Image</TableHead>
                   <TableHead className="min-w-[120px] md:min-w-[160px]">Code</TableHead>
                   <TableHead className="w-full min-w-[200px]">Désignation</TableHead>
                   <TableHead>Catégorie</TableHead>
                   <TableHead className="text-right">Prix vente</TableHead>
                   <TableHead className="text-right hidden sm:table-cell">Prix achat</TableHead>
                   <TableHead className="text-right hidden lg:table-cell">TVA</TableHead>
                   <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                 {filtered.map((p, i) => (
                   <TableRow key={p.id} className={`cursor-pointer hover:bg-muted/30 transition-colors ${i % 2 !== 0 ? "bg-muted/10" : ""}`} onClick={() => openEdit(p)}>
                    <TableCell>
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="h-8 w-8 rounded object-cover border border-border" />
                      ) : (
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-[10px] md:text-xs">{p.code}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.category || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(p.sale_price)}</TableCell>
                    <TableCell className="text-right hidden sm:table-cell">{formatCurrency(p.purchase_price)}</TableCell>
                    <TableCell className="text-right hidden lg:table-cell">{p.tva_rate}%</TableCell>
                    <TableCell>
                       <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                         <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" 
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateProduct(p.id);
                          }}
                          title="Dupliquer"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        {can("DELETE", "products") && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteProduct(p.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Aucun résultat.</p>}
          </div>
        )}

        <ProductFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          product={editingProduct}
          onSave={handleSave}
        />
      </div>
    </AppLayout>
  );
}
