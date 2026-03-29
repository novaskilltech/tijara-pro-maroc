-- Migration Lot 5 : Automatisation & Workflow 1:1
-- Ajout des liens vers les devis sources pour les BL et Factures

-- Pour les BL (deliveries)
ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS quotation_id UUID REFERENCES public.quotations(id);

CREATE INDEX IF NOT EXISTS idx_deliveries_quotation_id ON public.deliveries(quotation_id);

-- Pour les Factures (invoices)
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS quotation_id UUID REFERENCES public.quotations(id),
ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES public.warehouses(id);

CREATE INDEX IF NOT EXISTS idx_invoices_quotation_id ON public.invoices(quotation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_warehouse_id ON public.invoices(warehouse_id);

-- Ajout d'une colonne de statut pour le suivi de la déduction de stock si vente directe
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS stock_deducted BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.deliveries.quotation_id IS 'ID du devis d''origine si conversion directe';
COMMENT ON COLUMN public.invoices.quotation_id IS 'ID du devis d''origine si conversion directe';
COMMENT ON COLUMN public.invoices.stock_deducted IS 'VRAI si le stock a été déduit lors de la validation de la facture (cas sans BL)';
