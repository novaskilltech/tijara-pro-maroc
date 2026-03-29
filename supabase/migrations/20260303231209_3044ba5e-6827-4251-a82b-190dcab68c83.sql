
-- Drop the old unique constraint on invoice_number alone
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_invoice_number_key;

-- Add composite unique constraint: same number allowed across different companies
ALTER TABLE public.invoices ADD CONSTRAINT invoices_company_invoice_number_key UNIQUE (company_id, invoice_number);
