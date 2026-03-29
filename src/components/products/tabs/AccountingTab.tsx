import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Product } from "@/hooks/useProducts";

interface AccountingTabProps {
  form: Partial<Product>;
  updateField: (key: string, value: any) => void;
}

export function AccountingTab({ form, updateField }: AccountingTabProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">
      <div>
        <Label>TVA à la vente (%)</Label>
        <Input type="number" value={form.tva_rate ?? 20} onChange={(e) => updateField("tva_rate", Number(e.target.value))} />
      </div>
      <div>
        <Label>Coût standard (MAD)</Label>
        <Input type="number" value={form.purchase_price ?? 0} readOnly className="bg-muted/50" />
        <p className="text-xs text-muted-foreground mt-1">Basé sur le CMUP calculé automatiquement.</p>
      </div>
      <div className="sm:col-span-2">
        <p className="text-sm text-muted-foreground">
          Les comptes comptables sont gérés au niveau des paramètres système. Les écritures sont générées automatiquement lors de la facturation.
        </p>
      </div>
    </div>
  );
}
