import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Product, useProductFiles } from "@/hooks/useProducts";
import { ProductImageUpload } from "@/components/ProductImageUpload";
import { CategoryDropdowns } from "@/components/products/CategoryDropdowns";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useUnitsOfMeasure } from "@/hooks/useUnitsOfMeasure";
import { Upload, Trash2, Download, FileText } from "lucide-react";

interface GeneralTabProps {
  form: Partial<Product> & { category_id?: string | null };
  updateField: (key: string, value: any) => void;
  productId?: string | null;
}

const productTypes = [
  { value: "stockable", label: "Produit stockable" },
  { value: "consumable", label: "Produit consommable" },
  { value: "service", label: "Service" },
];

export function GeneralTab({ form, updateField, productId }: GeneralTabProps) {
  const { categories } = useProductCategories();
  const { activeUnits } = useUnitsOfMeasure();
  const { files, addFile, deleteFile } = useProductFiles(productId || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || !productId) return;
    for (let i = 0; i < fileList.length; i++) {
      await addFile(productId, fileList[i]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <div className="space-y-6">
      {/* Top row: Image + Name + Code + Type */}
      <div className="flex gap-5 items-start">
        <ProductImageUpload
          productId={productId || undefined}
          imageUrl={form.image_url}
          onImageChange={(url) => updateField("image_url", url)}
        />
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-3">
            <Label htmlFor="name">Nom du produit *</Label>
            <Input
              id="name"
              value={form.name || ""}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Nom du produit"
            />
          </div>
          <div>
            <Label htmlFor="code">Référence interne *</Label>
            <Input
              id="code"
              value={form.code || ""}
              onChange={(e) => updateField("code", e.target.value)}
              placeholder="ART-001"
            />
          </div>
          <div>
            <Label htmlFor="product_type">Type de produit</Label>
            <Select
              value={form.product_type || "stockable"}
              onValueChange={(v) => updateField("product_type", v)}
            >
              <SelectTrigger id="product_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {productTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="barcode">Code-barres</Label>
            <Input
              id="barcode"
              value={form.barcode || ""}
              onChange={(e) => updateField("barcode", e.target.value)}
              placeholder="EAN13"
            />
          </div>
        </div>
      </div>

      {/* Fields grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Category */}
        <div className="sm:col-span-2 lg:col-span-3">
          <Label>Catégorie</Label>
          <CategoryDropdowns
            value={form.category_id ?? null}
            onChange={(id) => updateField("category_id", id)}
            categories={categories}
          />
        </div>

        <div>
          <Label htmlFor="unit">Unité de vente</Label>
          {activeUnits.length > 0 ? (
            <Select
              value={form.unit || "Unité"}
              onValueChange={(v) => updateField("unit", v)}
            >
              <SelectTrigger id="unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {activeUnits.map((u) => (
                  <SelectItem key={u.id} value={u.name}>
                    {u.name} ({u.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="unit"
              value={form.unit || "Unité"}
              onChange={(e) => updateField("unit", e.target.value)}
              placeholder="Unité, Kg, L..."
            />
          )}
        </div>

        <div>
          <Label htmlFor="purchase_unit">Unité d'achat</Label>
          {activeUnits.length > 0 ? (
            <Select
              value={form.purchase_unit || "Unité"}
              onValueChange={(v) => updateField("purchase_unit", v)}
            >
              <SelectTrigger id="purchase_unit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {activeUnits.map((u) => (
                  <SelectItem key={u.id} value={u.name}>
                    {u.name} ({u.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="purchase_unit"
              value={form.purchase_unit || "Unité"}
              onChange={(e) => updateField("purchase_unit", e.target.value)}
              placeholder="Unité, Kg, L..."
            />
          )}
        </div>

        <div>
          <Label htmlFor="sale_price">Prix de vente (MAD)</Label>
          <Input
            id="sale_price"
            type="number"
            value={form.sale_price ?? 0}
            onChange={(e) => updateField("sale_price", Number(e.target.value))}
          />
        </div>

        <div>
          <Label htmlFor="purchase_price">Coût d'achat (MAD)</Label>
          <Input
            id="purchase_price"
            type="number"
            value={form.purchase_price ?? 0}
            onChange={(e) => updateField("purchase_price", Number(e.target.value))}
          />
        </div>

        <div>
          <Label htmlFor="tva_rate">TVA (%)</Label>
          <Input
            id="tva_rate"
            type="number"
            value={form.tva_rate ?? 20}
            onChange={(e) => updateField("tva_rate", Number(e.target.value))}
          />
        </div>

        <div>
          <Label htmlFor="weight">Poids (kg)</Label>
          <Input
            id="weight"
            type="number"
            value={form.weight ?? 0}
            onChange={(e) => updateField("weight", Number(e.target.value))}
            step="0.01"
          />
        </div>

        {form.product_type !== "service" && (
          <div>
            <Label htmlFor="min_stock">Stock minimum</Label>
            <Input
              id="min_stock"
              type="number"
              value={form.min_stock ?? 0}
              onChange={(e) => updateField("min_stock", Number(e.target.value))}
            />
          </div>
        )}

        <div className="flex items-center gap-4 sm:col-span-2 lg:col-span-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="can_be_sold"
              checked={form.can_be_sold ?? true}
              onCheckedChange={(v) => updateField("can_be_sold", !!v)}
            />
            <Label htmlFor="can_be_sold" className="font-normal cursor-pointer">Peut être vendu</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="can_be_purchased"
              checked={form.can_be_purchased ?? true}
              onCheckedChange={(v) => updateField("can_be_purchased", !!v)}
            />
            <Label htmlFor="can_be_purchased" className="font-normal cursor-pointer">Peut être acheté</Label>
          </div>
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            value={form.description || ""}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Description du produit"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            rows={3}
          />
        </div>
      </div>

      {/* Attachments Section - only when editing */}
      {productId && (
        <div className="space-y-6 border-t border-border pt-6">
          {/* Files */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold">Documents & fichiers</h3>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4" /> Ajouter un fichier
              </Button>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
            </div>
            {files.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                <FileText className="h-7 w-7 mx-auto mb-1.5 opacity-50" />
                <p className="text-sm">Aucun fichier joint.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {files.map((f) => (
                  <div key={f.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{f.file_name}</p>
                        <p className="text-xs text-muted-foreground">{formatSize(f.file_size)} • {new Date(f.created_at).toLocaleDateString("fr-FR")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                        <a href={f.file_url} target="_blank" rel="noopener noreferrer"><Download className="h-3.5 w-3.5" /></a>
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteFile(f.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
