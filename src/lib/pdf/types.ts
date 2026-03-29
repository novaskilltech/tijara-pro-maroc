// ─── Shared PDF data types ────────────────────────────────────────────────────

export type PdfDocumentType =
  | "devis"
  | "commande_client"
  | "bon_livraison"
  | "facture_client"
  | "avoir_client"
  | "commande_fournisseur"
  | "reception"
  | "facture_fournisseur"
  | "avoir_fournisseur"
  | "journal_ventes"
  | "journal_achats";

export interface PdfCompany {
  raison_sociale: string;
  forme_juridique?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  phone?: string | null;
  fax?: string | null;
  email?: string | null;
  website?: string | null;
  logo_url?: string | null;
  ice?: string | null;
  if_number?: string | null;
  rc?: string | null;
  patente?: string | null;
  cnss?: string | null;
  capital?: number | null;
  legal_mentions?: string | null;
}

export interface PdfBankAccount {
  bank_name?: string | null;
  account_number?: string | null;
  rib?: string | null;
  swift?: string | null;
  account_name?: string | null;
}

export interface PdfParty {
  name: string;
  ice?: string | null;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  rc?: string | null;
}

export interface PdfLine {
  ref?: string | null;
  description: string;
  quantity: number;
  unit?: string | null;
  unit_price: number;
  discount_percent?: number;
  tva_rate: number;
  total_ht: number;
  total_ttc: number;
}

export interface PdfDocumentData {
  type: PdfDocumentType;
  number: string;
  date: string;
  dueDate?: string | null;
  originRef?: string | null;
  paymentTerms?: string | null;
  party: PdfParty;
  deliveryAddress?: string | null;
  lines: PdfLine[];
  subtotalHt: number;
  totalTva: number;
  totalTtc: number;
  globalDiscountAmount?: number;
  globalDiscountLabel?: string;
  remainingBalance?: number | null;
  amountPaid?: number | null;
  notes?: string | null;
  company: PdfCompany;
  bankAccount?: PdfBankAccount | null;
}

export const DOC_TITLES: Record<PdfDocumentType, string> = {
  devis: "DEVIS",
  commande_client: "BON DE COMMANDE",
  bon_livraison: "BON DE LIVRAISON",
  facture_client: "FACTURE",
  avoir_client: "AVOIR",
  commande_fournisseur: "BON DE COMMANDE FOURNISSEUR",
  reception: "BON DE RÉCEPTION",
  facture_fournisseur: "FACTURE FOURNISSEUR",
  avoir_fournisseur: "AVOIR FOURNISSEUR",
  journal_ventes: "JOURNAL DES VENTES",
  journal_achats: "JOURNAL DES ACHATS",
};

export const DOC_PARTY_LABEL: Record<PdfDocumentType, string> = {
  devis: "CLIENT",
  commande_client: "CLIENT",
  bon_livraison: "CLIENT",
  facture_client: "CLIENT",
  avoir_client: "CLIENT",
  commande_fournisseur: "FOURNISSEUR",
  reception: "FOURNISSEUR",
  facture_fournisseur: "FOURNISSEUR",
  avoir_fournisseur: "FOURNISSEUR",
  journal_ventes: "TIERS",
  journal_achats: "TIERS",
};

// Accent colors (TIJARAPRO brand)
export const BRAND = {
  primary: "#26B6E7",   // cyan accent
  navy: "#002B49",      // structural navy
  navyLight: "#003A63",
  cyan10: "#EBF8FD",    // very light cyan
  cyan20: "#C7EEF9",
  textDark: "#1A2B3C",
  textMid: "#4A6070",
  textLight: "#7A919E",
  border: "#D4E2E9",
  white: "#FFFFFF",
  zebra: "#F4FAFD",
};
