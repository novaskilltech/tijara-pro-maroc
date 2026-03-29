
-- Add unique constraints for cash_registers per company
CREATE UNIQUE INDEX IF NOT EXISTS cash_registers_company_code_unique ON public.cash_registers (company_id, code);
CREATE UNIQUE INDEX IF NOT EXISTS cash_registers_company_name_unique ON public.cash_registers (company_id, name);
