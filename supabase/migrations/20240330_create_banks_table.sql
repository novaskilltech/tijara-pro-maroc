-- Create banks table
CREATE TABLE IF NOT EXISTS public.banks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT,
    is_active BOOLEAN DEFAULT true,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS to banks
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view banks of their company" ON public.banks
    FOR SELECT USING (auth.uid() IN (
        SELECT user_id FROM public.company_users WHERE company_id = banks.company_id
    ));

CREATE POLICY "Users can manage banks of their company" ON public.banks
    FOR ALL USING (auth.uid() IN (
        SELECT user_id FROM public.company_users WHERE company_id = banks.company_id
    ));

-- Update suppliers table
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS bank_id UUID REFERENCES public.banks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS entity_type TEXT DEFAULT 'morale' CHECK (entity_type IN ('physique', 'morale'));

-- Update customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS bank_id UUID REFERENCES public.banks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS entity_type TEXT DEFAULT 'morale' CHECK (entity_type IN ('physique', 'morale'));

-- Create common Moroccan banks for initial seed (optional but helpful)
-- Note: In a real multi-tenant app, we might want global banks or per-company. 
-- Here we'll let the user create them per company as requested.
