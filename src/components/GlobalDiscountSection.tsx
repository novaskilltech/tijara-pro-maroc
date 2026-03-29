import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface GlobalDiscount {
  type: "percentage" | "fixed";
  value: number;
}

interface GlobalDiscountSectionProps {
  discount: GlobalDiscount;
  onChange: (d: GlobalDiscount) => void;
  maxAmount: number;
  readOnly?: boolean;
}

export function GlobalDiscountSection({ discount, onChange, maxAmount, readOnly }: GlobalDiscountSectionProps) {
  const handleValueChange = (raw: string) => {
    const val = parseFloat(raw) || 0;
    if (discount.type === "percentage" && val > 100) {
      return; // Remise invalide
    }
    if (discount.type === "fixed" && val > maxAmount) {
      return; // Remise invalide
    }
    onChange({ ...discount, value: val });
  };

  const handleTypeChange = (type: "percentage" | "fixed") => {
    onChange({ type, value: 0 });
  };

  if (readOnly) {
    if (!discount.value) return null;
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Remise globale :</span>
        <span className="font-medium">
          {discount.type === "percentage" ? `${discount.value}%` : `${discount.value.toFixed(2)} MAD`}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-3">
      <div className="space-y-1">
        <Label className="text-xs">Remise globale</Label>
        <Select value={discount.type} onValueChange={(v) => handleTypeChange(v as "percentage" | "fixed")}>
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="percentage">% Pourcentage</SelectItem>
            <SelectItem value="fixed">Montant fixe</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Valeur</Label>
        <Input
          className="h-8 w-[100px] text-xs"
          type="number"
          min={0}
          max={discount.type === "percentage" ? 100 : maxAmount}
          step={discount.type === "percentage" ? 0.5 : 0.01}
          value={discount.value || ""}
          onChange={(e) => handleValueChange(e.target.value)}
          placeholder={discount.type === "percentage" ? "%" : "MAD"}
        />
      </div>
    </div>
  );
}

/** Calculate global discount amount from type, value, and subtotal HT */
export function calcGlobalDiscountAmount(type: "percentage" | "fixed", value: number, subtotalHt: number): number {
  if (!value || value <= 0) return 0;
  if (type === "percentage") {
    const clamped = Math.min(value, 100);
    return Math.round(subtotalHt * clamped / 100 * 100) / 100;
  }
  return Math.round(Math.min(value, subtotalHt) * 100) / 100;
}

/** Recalculate TVA after global discount is applied proportionally */
export function calcTotalsWithGlobalDiscount(
  lines: { total_ht: number; total_tva: number; total_ttc: number; tva_rate?: number }[],
  globalDiscountType: "percentage" | "fixed",
  globalDiscountValue: number
) {
  const subtotalHtBrut = lines.reduce((s, l) => s + (l.total_ht || 0), 0);
  const globalDiscountAmount = calcGlobalDiscountAmount(globalDiscountType, globalDiscountValue, subtotalHtBrut);
  const subtotalHtNet = Math.round((subtotalHtBrut - globalDiscountAmount) * 100) / 100;

  // Recalculate TVA proportionally based on the discount ratio
  const ratio = subtotalHtBrut > 0 ? subtotalHtNet / subtotalHtBrut : 0;
  const totalTva = Math.round(lines.reduce((s, l) => s + (l.total_tva || 0), 0) * ratio * 100) / 100;
  const totalTtc = Math.round((subtotalHtNet + totalTva) * 100) / 100;

  return {
    subtotalHtBrut: Math.round(subtotalHtBrut * 100) / 100,
    globalDiscountAmount,
    subtotalHt: subtotalHtNet,
    totalTva,
    totalTtc,
  };
}
