import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Upload, Download, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Product } from "@/hooks/useProducts";

interface ProductImportExportProps {
  products: Product[];
  onImportDone: () => void;
}

interface ImportError {
  row: number;
  message: string;
}

export function ProductImportExport({ products, onImportDone }: ProductImportExportProps) {
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [imported, setImported] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportCSV = () => {
    const headers = ["code", "name", "category", "unit", "purchase_unit", "purchase_price", "sale_price", "tva_rate", "min_stock", "barcode", "product_type", "weight", "description"];
    const rows = products.map((p) =>
      headers.map((h) => {
        const val = (p as any)[h];
        if (val == null) return "";
        const str = String(val);
        return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `produits_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export terminé", description: `${products.length} produits exportés.` });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setErrors([]);
    setImported(0);

    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) {
      setErrors([{ row: 0, message: "Fichier vide ou sans données" }]);
      setImporting(false);
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const requiredFields = ["code", "name"];
    const missing = requiredFields.filter((f) => !headers.includes(f));
    if (missing.length > 0) {
      setErrors([{ row: 0, message: `Colonnes manquantes: ${missing.join(", ")}` }]);
      setImporting(false);
      return;
    }

    const existingCodes = new Set(products.map((p) => p.code));
    const importErrors: ImportError[] = [];
    let count = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const row: Record<string, any> = {};
      headers.forEach((h, idx) => { row[h] = values[idx] || ""; });

      if (!row.code || !row.name) {
        importErrors.push({ row: i + 1, message: "Code ou nom manquant" });
        continue;
      }
      if (existingCodes.has(row.code)) {
        importErrors.push({ row: i + 1, message: `Code "${row.code}" déjà existant` });
        continue;
      }

      const record: any = {
        code: row.code,
        name: row.name,
        category: row.category || null,
        unit: row.unit || "Unité",
        purchase_unit: row.purchase_unit || row.unit || "Unité",
        purchase_price: Number(row.purchase_price) || 0,
        sale_price: Number(row.sale_price) || 0,
        tva_rate: Number(row.tva_rate) || 20,
        min_stock: Number(row.min_stock) || 0,
        barcode: row.barcode || null,
        product_type: row.product_type || "stockable",
        weight: Number(row.weight) || 0,
        description: row.description || null,
      };

      const { error } = await (supabase as any).from("products").insert(record);
      if (error) {
        importErrors.push({ row: i + 1, message: error.message });
      } else {
        existingCodes.add(row.code);
        count++;
      }
    }

    setErrors(importErrors);
    setImported(count);
    setImporting(false);
    if (count > 0) onImportDone();
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCSV}>
          <Download className="h-4 w-4" /> Exporter CSV
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setImportOpen(true)}>
          <Upload className="h-4 w-4" /> Importer CSV
        </Button>
      </div>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importer des produits</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Format CSV requis avec colonnes: <code className="text-xs bg-muted px-1 py-0.5 rounded">code, name, category, unit, sale_price, purchase_price, tva_rate, product_type</code>
            </p>
            <div>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} disabled={importing} className="text-sm" />
            </div>
            {importing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Import en cours...
              </div>
            )}
            {imported > 0 && (
              <div className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" /> {imported} produit(s) importé(s) avec succès.
              </div>
            )}
            {errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Ligne {err.row}: {err.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
