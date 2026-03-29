/**
 * Format a number as Moroccan currency (e.g. "12 500,00 MAD")
 */
export function formatCurrency(value: number | null | undefined, currency: string = "MAD"): string {
  if (value === null || value === undefined) return "—";
  
  const formatter = new Intl.NumberFormat('fr-MA', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  });

  return `${formatter.format(value)} ${currency}`;
}
