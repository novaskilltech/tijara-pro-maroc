
-- Add company_id to stock_levels
ALTER TABLE public.stock_levels
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- Backfill existing rows with the first company found (optional safety net)
UPDATE public.stock_levels sl
SET company_id = (
  SELECT id FROM public.companies ORDER BY created_at LIMIT 1
)
WHERE sl.company_id IS NULL;

-- Add company_id to stock_movements if missing
ALTER TABLE public.stock_movements
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

UPDATE public.stock_movements sm
SET company_id = (
  SELECT id FROM public.companies ORDER BY created_at LIMIT 1
)
WHERE sm.company_id IS NULL;

-- Add company_id to stock_transfers if missing
ALTER TABLE public.stock_transfers
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

UPDATE public.stock_transfers st
SET company_id = (
  SELECT id FROM public.companies ORDER BY created_at LIMIT 1
)
WHERE st.company_id IS NULL;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
