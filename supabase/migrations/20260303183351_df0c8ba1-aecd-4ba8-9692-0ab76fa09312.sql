
-- supplier_invoice_lines is an unused ghost table (system uses invoices+invoice_lines for supplier invoices).
-- Add a deny-all policy so the linter is satisfied and no data leaks.
CREATE POLICY "Deny all access to unused table"
  ON public.supplier_invoice_lines FOR ALL
  USING (false)
  WITH CHECK (false);
