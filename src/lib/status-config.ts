/**
 * Centralized status configuration for all ERP document types.
 * All color classes use semantic design tokens ONLY — no hardcoded colors.
 */

export interface StatusCfg {
  label: string;
  className: string; // badge classes
}

// ─── Purchase Requests ───────────────────────────────────────────────
export const PURCHASE_REQUEST_STATUS: Record<string, StatusCfg> = {
  draft:     { label: "Brouillon",  className: "bg-muted text-muted-foreground" },
  submitted: { label: "Soumise",    className: "bg-warning/15 text-warning-foreground border-warning/30" },
  approved:  { label: "Approuvée",  className: "bg-success/15 text-success border-success/30" },
  validated: { label: "Approuvée",  className: "bg-success/15 text-success border-success/30" },
  confirmed: { label: "Confirmée", className: "bg-primary/15 text-primary border-primary/20" },
  refused:   { label: "Refusée",    className: "bg-destructive/15 text-destructive border-destructive/30" },
  cancelled: { label: "Annulée",    className: "bg-muted text-muted-foreground line-through" },
};

// ─── Purchase Orders ─────────────────────────────────────────────────
export const PURCHASE_ORDER_STATUS: Record<string, StatusCfg> = {
  draft:              { label: "Brouillon",          className: "bg-muted text-muted-foreground" },
  confirmed:          { label: "Confirmée",           className: "bg-primary/15 text-primary border-primary/20" },
  partially_received: { label: "Partiellement reçue", className: "bg-warning/15 text-warning-foreground border-warning/30" },
  received:           { label: "Reçue",               className: "bg-success/15 text-success border-success/30" },
  invoiced:           { label: "Facturée",            className: "bg-accent text-accent-foreground border-border" },
  cancelled:          { label: "Annulée",             className: "bg-destructive/10 text-destructive border-destructive/20" },
  validated:          { label: "Confirmée",           className: "bg-primary/15 text-primary border-primary/20" },
};

// ─── Receptions ──────────────────────────────────────────────────────
export const RECEPTION_STATUS: Record<string, StatusCfg> = {
  draft:     { label: "Brouillon", className: "bg-muted text-muted-foreground" },
  validated: { label: "Validée",   className: "bg-success/15 text-success border-success/30" },
  cancelled: { label: "Annulée",   className: "bg-destructive/10 text-destructive border-destructive/20" },
};

// ─── Sales / Quotations ──────────────────────────────────────────────
export const QUOTATION_STATUS: Record<string, StatusCfg> = {
  draft:         { label: "Brouillon",            className: "bg-muted text-muted-foreground" },
  sent:          { label: "Envoyé",               className: "bg-secondary/20 text-secondary-foreground border-secondary/30" },
  confirmed:     { label: "Confirmé",             className: "bg-success/15 text-success border-success/30" },
  converted:     { label: "Converti en BC",       className: "bg-primary/15 text-primary border-primary/20" },
  cancelled:     { label: "Annulé",               className: "bg-destructive/10 text-destructive border-destructive/20" },
  expired:       { label: "Expiré",               className: "bg-warning/15 text-warning-foreground border-warning/30" },
  pending_admin: { label: "En attente validation",className: "bg-warning/15 text-warning-foreground border-warning/30" },
};

// ─── Sales Orders ────────────────────────────────────────────────────
export const SALES_ORDER_STATUS: Record<string, StatusCfg> = {
  draft:               { label: "Brouillon",            className: "bg-muted text-muted-foreground" },
  confirmed:           { label: "Confirmé",             className: "bg-primary/15 text-primary border-primary/20" },
  partially_delivered: { label: "Partiellement livré",  className: "bg-warning/15 text-warning-foreground border-warning/30" },
  delivered:           { label: "Livré",                className: "bg-success/15 text-success border-success/30" },
  invoiced:            { label: "Facturé",              className: "bg-accent text-accent-foreground border-border" },
  cancelled:           { label: "Annulé",               className: "bg-destructive/10 text-destructive border-destructive/20" },
};

// ─── Deliveries ──────────────────────────────────────────────────────
export const DELIVERY_STATUS: Record<string, StatusCfg> = {
  draft:     { label: "Brouillon", className: "bg-muted text-muted-foreground" },
  validated: { label: "Validé",   className: "bg-success/15 text-success border-success/30" },
  cancelled: { label: "Annulé",   className: "bg-destructive/10 text-destructive border-destructive/20" },
};

// ─── Invoices ────────────────────────────────────────────────────────
export const INVOICE_STATUS: Record<string, StatusCfg> = {
  draft:     { label: "Brouillon", className: "bg-muted text-muted-foreground" },
  validated: { label: "Validée",  className: "bg-primary/15 text-primary border-primary/20" },
  paid:      { label: "Payée",    className: "bg-success/15 text-success border-success/30" },
  cancelled: { label: "Annulée",  className: "bg-destructive/10 text-destructive border-destructive/20" },
};

// ─── Expenses ────────────────────────────────────────────────────────
export const EXPENSE_STATUS: Record<string, StatusCfg> = {
  pending:   { label: "En attente", className: "bg-warning/15 text-warning-foreground border-warning/30" },
  paid:      { label: "Payée",      className: "bg-success/15 text-success border-success/30" },
  cancelled: { label: "Annulée",   className: "bg-destructive/10 text-destructive border-destructive/20" },
};

/** Generic fallback */
export const STATUS_FALLBACK: StatusCfg = { label: "Brouillon", className: "bg-muted text-muted-foreground" };

export function getStatus(map: Record<string, StatusCfg>, status: string): StatusCfg {
  return map[status] ?? STATUS_FALLBACK;
}
