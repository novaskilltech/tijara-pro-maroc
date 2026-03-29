import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Product } from "@/hooks/useProducts";
import { useUnitsOfMeasure } from "@/hooks/useUnitsOfMeasure";

interface SalesTabProps {
  form: Partial<Product>;
  updateField: (key: string, value: any) => void;
}

export function SalesTab({ form, updateField }: SalesTabProps) {
  const { activeUnits, getConversionFactor } = useUnitsOfMeasure();

  if (!form.can_be_sold) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg font-medium">Ce produit n'est pas marqué comme vendable</p>
        <p className="text-sm mt-1">Activez "Peut être vendu" dans l'onglet Informations générales.</p>
      </div>
    );
  }

  const convFactor = form.purchase_unit && form.unit && form.purchase_unit !== form.unit
    ? getConversionFactor(form.purchase_unit, form.unit)
    : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">
      <div>
        <Label htmlFor="sale_price_tab">Prix de vente (MAD)</Label>
        <Input id="sale_price_tab" type="number" value={form.sale_price ?? 0} onChange={(e) => updateField("sale_price", Number(e.target.value))} />
      </div>
      <div>
        <Label htmlFor="unit_sale">Unité de vente</Label>
        {activeUnits.length > 0 ? (
          <Select value={form.unit || "Unité"} onValueChange={(v) => updateField("unit", v)}>
            <SelectTrigger id="unit_sale"><SelectValue /></SelectTrigger>
            <SelectContent>
              {activeUnits.map((u) => (
                <SelectItem key={u.id} value={u.name}>{u.name} ({u.symbol})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input id="unit_sale" value={form.unit || "Unité"} onChange={(e) => updateField("unit", e.target.value)} />
        )}
      </div>
      <div>
        <Label htmlFor="tva_vente">TVA vente (%)</Label>
        <Input id="tva_vente" type="number" value={form.tva_rate ?? 20} onChange={(e) => updateField("tva_rate", Number(e.target.value))} />
      </div>

      {convFactor !== null && (
        <div className="sm:col-span-2 bg-muted/50 rounded-md p-3 text-sm">
          <span className="font-medium">Conversion :</span>{" "}
          1 {form.purchase_unit} = {convFactor} {form.unit}
        </div>
      )}

      <div className="sm:col-span-2">
        <p className="text-sm text-muted-foreground">
          Le prix de vente peut être surchargé au niveau de chaque variante dans l'onglet "Attributs & Variantes".
        </p>
      </div>
    </div>
  );
}
