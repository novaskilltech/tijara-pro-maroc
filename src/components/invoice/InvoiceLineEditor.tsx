import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Trash2, Plus } from "lucide-react";
import { calcLineTotals, type InvoiceLine } from "@/types/invoice";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface Product {
  id: string;
  code: string;
  name: string;
  sale_price: number;
  purchase_price: number;
  tva_rate: number;
}

interface InvoiceLineEditorProps {
  lines: Partial<InvoiceLine>[];
  onChange: (lines: Partial<InvoiceLine>[]) => void;
  products: Product[];
  invoiceType: "client" | "supplier";
  readOnly?: boolean;
}

export function InvoiceLineEditor({ lines, onChange, products, invoiceType, readOnly }: InvoiceLineEditorProps) {
  const addLine = () => {
    onChange([...lines, { description: "", quantity: 1, unit_price: 0, discount_percent: 0, tva_rate: 20, total_ht: 0, total_tva: 0, total_ttc: 0 }]);
  };

  const removeLine = (index: number) => {
    onChange(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: string, value: any) => {
    const updated = [...lines];
    const line = { ...updated[index], [field]: value };

    // If product selected, fill defaults
    if (field === "product_id" && value) {
      const product = products.find((p) => p.id === value);
      if (product) {
        line.description = product.name;
        line.unit_price = invoiceType === "client" ? product.sale_price : product.purchase_price;
        line.tva_rate = product.tva_rate;
      }
    }

    // Recalc
    const qty = Number(line.quantity) || 0;
    const up = Number(line.unit_price) || 0;
    const disc = Number(line.discount_percent) || 0;
    const tva = Number(line.tva_rate) || 0;
    const totals = calcLineTotals(qty, up, disc, tva);
    Object.assign(line, totals);

    updated[index] = line;
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="bg-card rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Produit</TableHead>
              <TableHead>Désignation</TableHead>
              <TableHead className="w-[80px]">Qté</TableHead>
              <TableHead className="w-[100px]">P.U.</TableHead>
              <TableHead className="w-[80px]">Rem. %</TableHead>
              <TableHead className="w-[80px]">TVA %</TableHead>
              <TableHead className="w-[100px] text-right">Total HT</TableHead>
              {!readOnly && <TableHead className="w-[50px]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 && (
              <TableRow>
                <TableCell colSpan={readOnly ? 7 : 8} className="text-center text-muted-foreground py-8">
                  Aucune ligne. Cliquez "Ajouter une ligne" pour commencer.
                </TableCell>
              </TableRow>
            )}
            {lines.map((line, i) => (
              <TableRow key={i}>
                <TableCell>
                  {readOnly ? (
                    <span className="text-sm">{products.find((p) => p.id === line.product_id)?.code || "—"}</span>
                  ) : (
                    <SearchableSelect
                      options={products.map(p => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
                      value={line.product_id || ""}
                      onValueChange={(v) => updateLine(i, "product_id", v)}
                      placeholder="Produit..."
                      className="min-w-[160px]"
                    />
                  )}
                </TableCell>
                <TableCell>
                  {readOnly ? (
                    <span className="text-sm">{line.description}</span>
                  ) : (
                    <Input className="h-8 text-xs" value={line.description || ""} onChange={(e) => updateLine(i, "description", e.target.value)} />
                  )}
                </TableCell>
                <TableCell>
                  {readOnly ? line.quantity : (
                    <Input className="h-8 text-xs" type="number" min={0} value={line.quantity || ""} onChange={(e) => updateLine(i, "quantity", parseFloat(e.target.value))} />
                  )}
                </TableCell>
                <TableCell>
                  {readOnly ? Number(line.unit_price).toFixed(2) : (
                    <Input className="h-8 text-xs" type="number" min={0} step={0.01} value={line.unit_price || ""} onChange={(e) => updateLine(i, "unit_price", parseFloat(e.target.value))} />
                  )}
                </TableCell>
                <TableCell>
                  {readOnly ? `${line.discount_percent}%` : (
                    <Input className="h-8 text-xs" type="number" min={0} max={100} value={line.discount_percent || ""} onChange={(e) => updateLine(i, "discount_percent", parseFloat(e.target.value))} />
                  )}
                </TableCell>
                <TableCell>
                  {readOnly ? `${line.tva_rate}%` : (
                    <Input className="h-8 text-xs" type="number" min={0} value={line.tva_rate || ""} onChange={(e) => updateLine(i, "tva_rate", parseFloat(e.target.value))} />
                  )}
                </TableCell>
                <TableCell className="text-right font-medium text-sm">
                  {Number(line.total_ht || 0).toFixed(2)}
                </TableCell>
                {!readOnly && (
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLine(i)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {!readOnly && (
        <Button variant="outline" size="sm" onClick={addLine} className="gap-1">
          <Plus className="h-4 w-4" /> Ajouter une ligne
        </Button>
      )}
    </div>
  );
}
