import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Product } from "@/hooks/useProducts";
import { GeneralTab } from "./tabs/GeneralTab";
import { VariantsTab } from "./tabs/VariantsTab";
import { SalesTab } from "./tabs/SalesTab";
import { PurchasesTab } from "./tabs/PurchasesTab";
import { InventoryTab } from "./tabs/InventoryTab";
import { AuditLogViewer } from "@/components/system/AuditLogViewer";
import { usePermissions } from "@/hooks/usePermissions";
import { useCompany } from "@/hooks/useCompany";

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onSave: (data: Partial<Product>) => Promise<any>;
}

const defaultForm: Partial<Product> = {
  code: "",
  name: "",
  description: "",
  category: "",
  unit: "Unité",
  purchase_unit: "Unité",
  purchase_price: 0,
  sale_price: 0,
  tva_rate: 20,
  min_stock: 0,
  barcode: "",
  image_url: null,
  product_type: "stockable",
  can_be_sold: true,
  can_be_purchased: true,
  weight: 0,
};

export function ProductFormDialog({ open, onOpenChange, product, onSave }: ProductFormDialogProps) {
  const { can } = usePermissions();
  const { activeCompany } = useCompany();
  const [form, setForm] = useState<Partial<Product>>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  const isEditing = !!product;
  const canSave = isEditing ? can("UPDATE", "products") : can("CREATE", "products");

  useEffect(() => {
    if (product) {
      setForm({ ...product });
    } else {
      setForm({ ...defaultForm });
    }
    setActiveTab("general");
  }, [product, open]);

  const updateField = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.name || !form.code) return;
    setSaving(true);
    const result = await onSave(form);
    setSaving(false);
    if (result) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] md:max-w-[92vw] lg:max-w-[88vw] xl:max-w-[82vw] max-h-[92vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="text-xl font-semibold">
            {isEditing ? "Modifier le produit" : "Nouveau produit"}
            {form.name && <span className="text-muted-foreground font-normal ml-2">— {form.name}</span>}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 border-b border-border">
            <TabsList className="bg-transparent h-auto p-0 gap-0">
              <TabsTrigger value="general" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm">
                Informations générales
              </TabsTrigger>
              <TabsTrigger value="variants" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm">
                Attributs & Variantes
              </TabsTrigger>
              <TabsTrigger value="sales" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm">
                Ventes
              </TabsTrigger>
              <TabsTrigger value="purchases" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm">
                Achats
              </TabsTrigger>
              {form.product_type === "stockable" && (
                <TabsTrigger value="inventory" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm">
                  Inventaire
                </TabsTrigger>
              )}
              {isEditing && (
                <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-sm">
                  Historique
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <TabsContent value="general" className="mt-0">
              <GeneralTab form={form} updateField={updateField} productId={product?.id || null} />
            </TabsContent>
            <TabsContent value="variants" className="mt-0">
              <VariantsTab productId={product?.id || null} productName={form.name} productUnit={form.unit} />
            </TabsContent>
            <TabsContent value="sales" className="mt-0">
              <SalesTab form={form} updateField={updateField} />
            </TabsContent>
            <TabsContent value="purchases" className="mt-0">
              <PurchasesTab form={form} updateField={updateField} />
            </TabsContent>
            {form.product_type === "stockable" && (
              <TabsContent value="inventory" className="mt-0">
                <InventoryTab productId={product?.id || null} />
              </TabsContent>
            )}
            {isEditing && (
              <TabsContent value="history" className="mt-0 h-[450px]">
                <div className="bg-card border rounded-md h-full overflow-hidden">
                  <AuditLogViewer 
                    tableName="products" 
                    recordId={product!.id} 
                    companyId={activeCompany?.id || null} 
                  />
                </div>
              </TabsContent>
            )}
          </div>
        </Tabs>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/30">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {canSave ? "Annuler" : "Fermer"}
          </Button>
          {canSave && (
            <Button onClick={handleSave} disabled={saving || !form.name || !form.code}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {isEditing ? "Enregistrer" : "Créer"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
