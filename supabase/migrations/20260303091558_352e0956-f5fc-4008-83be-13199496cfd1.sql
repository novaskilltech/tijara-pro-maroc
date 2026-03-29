
-- ============================================================
-- FIX: Replace all USING(true) SELECT policies with company-scoped
-- policies on tables that have a company_id column.
-- Pattern: user_has_company(auth.uid(), company_id) OR is_admin(auth.uid())
-- ============================================================

-- 1. CUSTOMERS
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
CREATE POLICY "Users view own company customers"
  ON public.customers FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR user_has_company(auth.uid(), company_id)
    OR is_admin(auth.uid())
  );

-- 2. SUPPLIERS
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers;
CREATE POLICY "Users view own company suppliers"
  ON public.suppliers FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR user_has_company(auth.uid(), company_id)
    OR is_admin(auth.uid())
  );

-- 3. PRODUCTS
DROP POLICY IF EXISTS "Authenticated users can view products" ON public.products;
CREATE POLICY "Users view own company products"
  ON public.products FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR user_has_company(auth.uid(), company_id)
    OR is_admin(auth.uid())
  );

-- 4. WAREHOUSES
DROP POLICY IF EXISTS "Auth users can view warehouses" ON public.warehouses;
CREATE POLICY "Users view own company warehouses"
  ON public.warehouses FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR user_has_company(auth.uid(), company_id)
    OR is_admin(auth.uid())
  );

-- 5. BANK_ACCOUNTS
DROP POLICY IF EXISTS "Authenticated users can view bank accounts" ON public.bank_accounts;
CREATE POLICY "Users view own company bank accounts"
  ON public.bank_accounts FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR user_has_company(auth.uid(), company_id)
    OR is_admin(auth.uid())
  );

-- 6. BANK_TRANSACTIONS
DROP POLICY IF EXISTS "Auth users can view bank transactions" ON public.bank_transactions;
CREATE POLICY "Users view own company bank transactions"
  ON public.bank_transactions FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR user_has_company(auth.uid(), company_id)
    OR is_admin(auth.uid())
  );

-- 7. CASH_REGISTERS
DROP POLICY IF EXISTS "Auth users can view cash registers" ON public.cash_registers;
CREATE POLICY "Users view own company cash registers"
  ON public.cash_registers FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR user_has_company(auth.uid(), company_id)
    OR is_admin(auth.uid())
  );

-- 8. CONTACTS
DROP POLICY IF EXISTS "Auth users can view contacts" ON public.contacts;
CREATE POLICY "Users view own company contacts"
  ON public.contacts FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR user_has_company(auth.uid(), company_id)
    OR is_admin(auth.uid())
  );

-- 9. EXPENSE_CATEGORIES
DROP POLICY IF EXISTS "Auth users can view expense categories" ON public.expense_categories;
CREATE POLICY "Users view own company expense categories"
  ON public.expense_categories FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR user_has_company(auth.uid(), company_id)
    OR is_admin(auth.uid())
  );

-- 10. EXPENSES
DROP POLICY IF EXISTS "Auth users can view expenses" ON public.expenses;
CREATE POLICY "Users view own company expenses"
  ON public.expenses FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR user_has_company(auth.uid(), company_id)
    OR is_admin(auth.uid())
  );

-- 11. INVOICES
DROP POLICY IF EXISTS "Auth users can view invoices" ON public.invoices;
CREATE POLICY "Users view own company invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR user_has_company(auth.uid(), company_id)
    OR is_admin(auth.uid())
  );

-- 12. INVOICE_LINES
DROP POLICY IF EXISTS "Auth users can view invoice lines" ON public.invoice_lines;
CREATE POLICY "Users view own company invoice lines"
  ON public.invoice_lines FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR user_has_company(auth.uid(), company_id)
    OR is_admin(auth.uid())
  );

-- 13. CREDIT_NOTES
DROP POLICY IF EXISTS "Auth users can view credit notes" ON public.credit_notes;
CREATE POLICY "Users view own company credit notes"
  ON public.credit_notes FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR user_has_company(auth.uid(), company_id)
    OR is_admin(auth.uid())
  );

-- 14. PAYMENTS
DROP POLICY IF EXISTS "Auth users can view payments" ON public.payments;
CREATE POLICY "Users view own company payments"
  ON public.payments FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR user_has_company(auth.uid(), company_id)
    OR is_admin(auth.uid())
  );

-- 15. PAYMENT_TERMS
DROP POLICY IF EXISTS "Auth users can view payment terms" ON public.payment_terms;
CREATE POLICY "Users view own company payment terms"
  ON public.payment_terms FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR user_has_company(auth.uid(), company_id)
    OR is_admin(auth.uid())
  );

-- 16. DELIVERIES
DROP POLICY IF EXISTS "Auth users can view deliveries" ON public.deliveries;
CREATE POLICY "Users view own company deliveries"
  ON public.deliveries FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR user_has_company(auth.uid(), company_id)
    OR is_admin(auth.uid())
  );

-- 17. DELIVERY_LINES
DROP POLICY IF EXISTS "Auth users can view delivery lines" ON public.delivery_lines;
CREATE POLICY "Users view own company delivery lines"
  ON public.delivery_lines FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR user_has_company(auth.uid(), company_id)
    OR is_admin(auth.uid())
  );

-- 18. QUOTATIONS
DROP POLICY IF EXISTS "Auth users can view quotations" ON public.quotations;
CREATE POLICY "Users view own company quotations"
  ON public.quotations FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR user_has_company(auth.uid(), company_id)
    OR is_admin(auth.uid())
  );

-- 19. QUOTATION_LINES
DROP POLICY IF EXISTS "Auth users can view quotation lines" ON public.quotation_lines;
CREATE POLICY "Users view own company quotation lines"
  ON public.quotation_lines FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR user_has_company(auth.uid(), company_id)
    OR is_admin(auth.uid())
  );

-- 20. SALES_ORDERS
DROP POLICY IF EXISTS "Auth users can view sales orders" ON public.sales_orders;
CREATE POLICY "Users view own company sales orders"
  ON public.sales_orders FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR user_has_company(auth.uid(), company_id)
    OR is_admin(auth.uid())
  );

-- 21. SALES_ORDER_LINES
DROP POLICY IF EXISTS "Auth users can view sales order lines" ON public.sales_order_lines;
CREATE POLICY "Users view own company sales order lines"
  ON public.sales_order_lines FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR user_has_company(auth.uid(), company_id)
    OR is_admin(auth.uid())
  );

-- 22. PURCHASE_REQUESTS
DROP POLICY IF EXISTS "Auth users can view purchase requests" ON public.purchase_requests;
CREATE POLICY "Users view own company purchase requests"
  ON public.purchase_requests FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR user_has_company(auth.uid(), company_id)
    OR is_admin(auth.uid())
  );

-- 23. PURCHASE_ORDERS
DROP POLICY IF EXISTS "Auth users can view purchase orders" ON public.purchase_orders;
CREATE POLICY "Users view own company purchase orders"
  ON public.purchase_orders FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR user_has_company(auth.uid(), company_id)
    OR is_admin(auth.uid())
  );

-- 24. PURCHASE_ORDER_LINES
DROP POLICY IF EXISTS "Auth users can view purchase order lines" ON public.purchase_order_lines;
CREATE POLICY "Users view own company purchase order lines"
  ON public.purchase_order_lines FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR user_has_company(auth.uid(), company_id)
    OR is_admin(auth.uid())
  );

-- 25. RECEPTIONS
DROP POLICY IF EXISTS "Auth users can view receptions" ON public.receptions;
CREATE POLICY "Users view own company receptions"
  ON public.receptions FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR user_has_company(auth.uid(), company_id)
    OR is_admin(auth.uid())
  );

-- 26. RECEPTION_LINES
DROP POLICY IF EXISTS "Auth users can view reception lines" ON public.reception_lines;
CREATE POLICY "Users view own company reception lines"
  ON public.reception_lines FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR user_has_company(auth.uid(), company_id)
    OR is_admin(auth.uid())
  );

-- 27. STOCK_LEVELS
DROP POLICY IF EXISTS "Auth users can view stock levels" ON public.stock_levels;
CREATE POLICY "Users view own company stock levels"
  ON public.stock_levels FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR user_has_company(auth.uid(), company_id)
    OR is_admin(auth.uid())
  );

-- 28. STOCK_MOVEMENTS
DROP POLICY IF EXISTS "Auth users can view stock movements" ON public.stock_movements;
CREATE POLICY "Users view own company stock movements"
  ON public.stock_movements FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR user_has_company(auth.uid(), company_id)
    OR is_admin(auth.uid())
  );

-- 29. STOCK_TRANSFERS
DROP POLICY IF EXISTS "Auth users can view stock transfers" ON public.stock_transfers;
CREATE POLICY "Users view own company stock transfers"
  ON public.stock_transfers FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR user_has_company(auth.uid(), company_id)
    OR is_admin(auth.uid())
  );

-- 30. INVENTORY_ADJUSTMENTS
DROP POLICY IF EXISTS "Auth users can view adjustments" ON public.inventory_adjustments;
CREATE POLICY "Users view own company adjustments"
  ON public.inventory_adjustments FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR user_has_company(auth.uid(), company_id)
    OR is_admin(auth.uid())
  );

-- 31. DOCUMENT_ATTACHMENTS
DROP POLICY IF EXISTS "Auth users can view doc attachments" ON public.document_attachments;
CREATE POLICY "Users view own company doc attachments"
  ON public.document_attachments FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR user_has_company(auth.uid(), company_id)
    OR is_admin(auth.uid())
  );

-- 32. DOCUMENT_TEMPLATES
DROP POLICY IF EXISTS "Auth users can view document templates" ON public.document_templates;
CREATE POLICY "Users view own company document templates"
  ON public.document_templates FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR user_has_company(auth.uid(), company_id)
    OR is_admin(auth.uid())
  );
