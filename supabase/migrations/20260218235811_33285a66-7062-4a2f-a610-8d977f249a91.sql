
-- =====================================================
-- PAYMENTS TABLE
-- =====================================================
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_number text NOT NULL,
  payment_type text NOT NULL, -- 'client' or 'supplier'
  payment_method text NOT NULL DEFAULT 'transfer', -- cash, cheque, transfer, lcn
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL DEFAULT 0,
  reference text,
  notes text,
  customer_id uuid REFERENCES public.customers(id),
  supplier_id uuid REFERENCES public.suppliers(id),
  bank_account_id uuid REFERENCES public.bank_accounts(id),
  cheque_number text,
  cheque_bank text,
  cheque_date date,
  lcn_due_date date,
  is_override boolean NOT NULL DEFAULT false,
  override_reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view payments" ON public.payments FOR SELECT USING (true);
CREATE POLICY "Admins and accountants can insert payments" ON public.payments FOR INSERT
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'accountant'::app_role));
CREATE POLICY "Admins and accountants can update payments" ON public.payments FOR UPDATE
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'accountant'::app_role));
CREATE POLICY "Only admins can delete payments" ON public.payments FOR DELETE
  USING (is_admin(auth.uid()));

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- PAYMENT ALLOCATIONS (payment <-> invoice linking)
-- =====================================================
CREATE TABLE public.payment_allocations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id),
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view allocations" ON public.payment_allocations FOR SELECT USING (true);
CREATE POLICY "Admins and accountants can manage allocations" ON public.payment_allocations FOR ALL
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'accountant'::app_role))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'accountant'::app_role));

-- =====================================================
-- BANK TRANSACTIONS (for reconciliation)
-- =====================================================
CREATE TABLE public.bank_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_account_id uuid NOT NULL REFERENCES public.bank_accounts(id),
  transaction_date date NOT NULL,
  description text NOT NULL DEFAULT '',
  reference text,
  debit numeric NOT NULL DEFAULT 0,
  credit numeric NOT NULL DEFAULT 0,
  is_reconciled boolean NOT NULL DEFAULT false,
  reconciled_payment_id uuid REFERENCES public.payments(id),
  reconciled_by uuid,
  reconciled_at timestamptz,
  imported_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view bank transactions" ON public.bank_transactions FOR SELECT USING (true);
CREATE POLICY "Admins and accountants can manage bank transactions" ON public.bank_transactions FOR ALL
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'accountant'::app_role))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'accountant'::app_role));

-- =====================================================
-- REMINDER LOGS
-- =====================================================
CREATE TABLE public.reminder_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id),
  customer_id uuid REFERENCES public.customers(id),
  reminder_type text NOT NULL DEFAULT 'email', -- email, whatsapp, phone
  reminder_date timestamptz NOT NULL DEFAULT now(),
  message text,
  sent_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view reminder logs" ON public.reminder_logs FOR SELECT USING (true);
CREATE POLICY "Admins and accountants can manage reminders" ON public.reminder_logs FOR ALL
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'accountant'::app_role))
  WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'accountant'::app_role));
