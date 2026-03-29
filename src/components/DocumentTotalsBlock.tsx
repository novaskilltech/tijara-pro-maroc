interface DocumentTotalsBlockProps {
  subtotalHtBrut: number;
  globalDiscountAmount: number;
  subtotalHt: number;
  totalTva: number;
  totalTtc: number;
  globalDiscountLabel?: string;
}

export function DocumentTotalsBlock({
  subtotalHtBrut,
  globalDiscountAmount,
  subtotalHt,
  totalTva,
  totalTtc,
  globalDiscountLabel,
}: DocumentTotalsBlockProps) {
  const fmt = (n: number) => n.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const hasGlobalDiscount = globalDiscountAmount > 0;

  return (
    <div className="w-72 space-y-1 text-sm">
      {hasGlobalDiscount && (
        <>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total HT brut</span>
            <span className="font-medium">{fmt(subtotalHtBrut)} MAD</span>
          </div>
          <div className="flex justify-between text-destructive">
            <span>{globalDiscountLabel || "Remise globale"}</span>
            <span className="font-medium">-{fmt(globalDiscountAmount)} MAD</span>
          </div>
        </>
      )}
      <div className="flex justify-between">
        <span className="text-muted-foreground">{hasGlobalDiscount ? "Total HT net" : "Total HT"}</span>
        <span className="font-medium">{fmt(subtotalHt)} MAD</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">TVA</span>
        <span className="font-medium">{fmt(totalTva)} MAD</span>
      </div>
      <div className="flex justify-between border-t pt-1 text-base">
        <span className="font-semibold">Total TTC</span>
        <span className="font-bold text-primary">{fmt(totalTtc)} MAD</span>
      </div>
    </div>
  );
}
