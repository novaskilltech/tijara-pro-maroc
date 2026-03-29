import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type TemplateDocType =
  | "demande_prix"
  | "bc_fournisseur"
  | "facture_fournisseur"
  | "avoir_fournisseur"
  | "devis_client"
  | "bc_client"
  | "facture_client";

export const TEMPLATE_DOC_LABELS: Record<TemplateDocType, string> = {
  demande_prix: "Demande de prix",
  bc_fournisseur: "BC Fournisseur",
  facture_fournisseur: "Facture Fournisseur",
  avoir_fournisseur: "Avoir Fournisseur",
  devis_client: "Devis Client",
  bc_client: "BC Client",
  facture_client: "Facture Client",
};

export type TemplateBlockType = "logo" | "title" | "doc_info" | "party" | "lines_table" | "totals" | "notes" | "footer" | "bank" | "custom_text" | "empty";

export interface TemplateBlock {
  id: string;
  type: TemplateBlockType;
  label: string;
  visible: boolean;
  order: number;
  styles: {
    fontSize?: number;
    color?: string;
    backgroundColor?: string;
    spacing?: number;
    alignment?: "left" | "center" | "right";
    offsetX?: number;
    offsetY?: number;
  };
  fields?: Record<string, boolean>;
  customContent?: string; // For custom_text blocks
}

export interface TemplateConfig {
  blocks: TemplateBlock[];
  globalStyles: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    headerFontSize: number;
    bodyFontSize: number;
  };
  /** Custom code mode fields (used by Source Code editor) */
  isCustomCode?: boolean;
  customHtml?: string;
  customCss?: string;
}

export type TemplateStatus = "draft" | "published";

export interface DocumentTemplate {
  id: string;
  company_id: string | null;
  document_type: string;
  template_json: TemplateConfig;
  version: number;
  is_active: boolean;
  status: TemplateStatus;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export const DEFAULT_BLOCKS: TemplateBlock[] = [
  {
    id: "logo",
    type: "logo",
    label: "Logo & Société + Client",
    visible: true,
    order: 0,
    styles: { fontSize: 13, spacing: 14 },
    fields: { logo: true, company_name: true, forme_juridique: true, address: true, phone: true, email: true, client_name: true, client_address: true, client_ice: true, client_rc: true, client_phone: true, client_email: true },
  },
  {
    id: "title",
    type: "title",
    label: "Titre du document",
    visible: true,
    order: 1,
    styles: { fontSize: 16, color: "#FFFFFF", backgroundColor: "#002B49", spacing: 12 },
  },
  {
    id: "doc_info",
    type: "doc_info",
    label: "Informations document",
    visible: true,
    order: 2,
    styles: { fontSize: 9, spacing: 12 },
    fields: { date: true, due_date: true, payment_terms: true, origin_ref: true },
  },
  {
    id: "lines_table",
    type: "lines_table",
    label: "Tableau des lignes",
    visible: true,
    order: 3,
    styles: { fontSize: 8, spacing: 10 },
    fields: { ref: true, description: true, qty: true, unit: true, unit_price: true, discount: true, tva: true, total_ht: true, total_ttc: true },
  },
  {
    id: "totals",
    type: "totals",
    label: "Totaux",
    visible: true,
    order: 4,
    styles: { fontSize: 8, spacing: 14 },
    fields: { total_ht: true, total_tva: true, total_ttc: true, amount_paid: true, remaining: true },
  },
  {
    id: "notes",
    type: "notes",
    label: "Notes / Conditions",
    visible: true,
    order: 5,
    styles: { fontSize: 8, spacing: 10 },
  },
  {
    id: "bank",
    type: "bank",
    label: "Coordonnées bancaires",
    visible: true,
    order: 6,
    styles: { fontSize: 7, spacing: 8 },
    fields: { bank_name: true, account_name: true, rib: true, swift: true },
  },
  {
    id: "footer",
    type: "footer",
    label: "Pied de page",
    visible: true,
    order: 7,
    styles: { fontSize: 7, spacing: 6 },
    fields: { ice: true, if_number: true, rc: true, patente: true, capital: true, phone: true, email: true, bank: true, page_numbers: true },
  },
];

export const DEFAULT_GLOBAL_STYLES: TemplateConfig["globalStyles"] = {
  primaryColor: "#26B6E7",
  secondaryColor: "#002B49",
  fontFamily: "Segoe UI, Arial, sans-serif",
  headerFontSize: 16,
  bodyFontSize: 9,
};

export function getDefaultTemplate(): TemplateConfig {
  return {
    blocks: DEFAULT_BLOCKS.map(b => ({ ...b, styles: { ...b.styles }, fields: b.fields ? { ...b.fields } : undefined })),
    globalStyles: { ...DEFAULT_GLOBAL_STYLES },
  };
}

/** Available dynamic placeholders for the template editor */
export const DYNAMIC_PLACEHOLDERS = [
  { key: "{{company.name}}", label: "Raison sociale" },
  { key: "{{company.ice}}", label: "ICE société" },
  { key: "{{company.rc}}", label: "RC société" },
  { key: "{{company.if}}", label: "IF société" },
  { key: "{{company.address}}", label: "Adresse société" },
  { key: "{{company.phone}}", label: "Téléphone société" },
  { key: "{{company.email}}", label: "Email société" },
  { key: "{{doc.number}}", label: "N° document" },
  { key: "{{doc.date}}", label: "Date document" },
  { key: "{{doc.due_date}}", label: "Date d'échéance" },
  { key: "{{doc.payment_terms}}", label: "Conditions paiement" },
  { key: "{{partner.name}}", label: "Nom client/fournisseur" },
  { key: "{{partner.ice}}", label: "ICE client/fournisseur" },
  { key: "{{partner.address}}", label: "Adresse client/fournisseur" },
  { key: "{{totals.ht}}", label: "Total HT" },
  { key: "{{totals.tva}}", label: "Total TVA" },
  { key: "{{totals.ttc}}", label: "Total TTC" },
  { key: "{{bank.name}}", label: "Nom banque" },
  { key: "{{bank.rib}}", label: "RIB" },
  { key: "{{bank.swift}}", label: "SWIFT" },
];

export function useDocumentTemplates() {
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    if (!activeCompany?.id) return [];
    const { data, error } = await (supabase as any)
      .from("document_templates")
      .select("*")
      .eq("company_id", activeCompany.id)
      .eq("is_active", true)
      .order("document_type")
      .order("version", { ascending: false });
    if (error) { console.error(error); return []; }
    return (data || []) as DocumentTemplate[];
  }, [activeCompany?.id]);

  const fetchTemplate = useCallback(async (docType: TemplateDocType): Promise<DocumentTemplate | null> => {
    if (!activeCompany?.id) return null;
    const { data, error } = await (supabase as any)
      .from("document_templates")
      .select("*")
      .eq("company_id", activeCompany.id)
      .eq("document_type", docType)
      .eq("is_active", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) { console.error(error); return null; }
    return data as DocumentTemplate | null;
  }, [activeCompany?.id]);

  /** Fetch published template for printing */
  const fetchPublishedTemplate = useCallback(async (docType: string): Promise<DocumentTemplate | null> => {
    if (!activeCompany?.id) return null;
    const { data, error } = await (supabase as any)
      .from("document_templates")
      .select("*")
      .eq("company_id", activeCompany.id)
      .eq("document_type", docType)
      .eq("is_active", true)
      .eq("status", "published")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) { console.error(error); return null; }
    return data as DocumentTemplate | null;
  }, [activeCompany?.id]);

  const saveTemplate = useCallback(async (docType: TemplateDocType, config: TemplateConfig, existingId?: string, status: TemplateStatus = "draft") => {
    if (!activeCompany?.id) return null;
    setLoading(true);
    try {
      if (existingId) {
        const { data, error } = await (supabase as any)
          .from("document_templates")
          .update({ template_json: config, updated_by: user?.id, status })
          .eq("id", existingId)
          .select()
          .single();
        if (error) throw error;
        toast.success(status === "published" ? "Template publié" : "Brouillon sauvegardé");
        return data as DocumentTemplate;
      } else {
        const { data: existing } = await (supabase as any)
          .from("document_templates")
          .select("version")
          .eq("company_id", activeCompany.id)
          .eq("document_type", docType)
          .order("version", { ascending: false })
          .limit(1);
        const nextVersion = (existing?.[0]?.version || 0) + 1;

        const { data, error } = await (supabase as any)
          .from("document_templates")
          .insert({
            company_id: activeCompany.id,
            document_type: docType,
            template_json: config,
            version: nextVersion,
            updated_by: user?.id,
            status,
          })
          .select()
          .single();
        if (error) throw error;
        toast.success(status === "published" ? `Template publié (v${nextVersion})` : `Brouillon créé (v${nextVersion})`);
        return data as DocumentTemplate;
      }
    } catch (err: any) {
      toast.error("Erreur: " + err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [activeCompany?.id, user?.id]);

  const publishTemplate = useCallback(async (docType: TemplateDocType, config: TemplateConfig, existingId?: string) => {
    return saveTemplate(docType, config, existingId, "published");
  }, [saveTemplate]);

  const saveAsCopy = useCallback(async (docType: TemplateDocType, config: TemplateConfig) => {
    if (activeCompany?.id) {
      await (supabase as any)
        .from("document_templates")
        .update({ is_active: false })
        .eq("company_id", activeCompany.id)
        .eq("document_type", docType);
    }
    return saveTemplate(docType, config);
  }, [activeCompany?.id, saveTemplate]);

  const restoreDefault = useCallback(async (docType: TemplateDocType) => {
    if (!activeCompany?.id) return;
    await (supabase as any)
      .from("document_templates")
      .update({ is_active: false })
      .eq("company_id", activeCompany.id)
      .eq("document_type", docType);
    toast.success("Template par défaut restauré");
  }, [activeCompany?.id]);

  return { fetchTemplates, fetchTemplate, fetchPublishedTemplate, saveTemplate, publishTemplate, saveAsCopy, restoreDefault, loading };
}
