-- Per-client billing overrides
CREATE TABLE public.client_billing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL UNIQUE,
  total_override_cents integer,
  currency text NOT NULL DEFAULT 'EUR',
  next_payment_due_at timestamptz,
  last_payment_at timestamptz,
  late_fee_percentage numeric NOT NULL DEFAULT 10.00,
  late_fee_enabled boolean NOT NULL DEFAULT true,
  late_fee_applied_count integer NOT NULL DEFAULT 0,
  late_fee_last_applied_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_billing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View client billing" ON public.client_billing
FOR SELECT TO authenticated
USING (
  client_id = current_profile_id()
  OR is_superadmin(auth.uid())
  OR (has_role(auth.uid(), 'admin'::app_role) AND admin_can_view_client(auth.uid(), client_id))
);

CREATE POLICY "Superadmins insert client billing" ON public.client_billing
FOR INSERT TO authenticated WITH CHECK (is_superadmin(auth.uid()));

CREATE POLICY "Superadmins update client billing" ON public.client_billing
FOR UPDATE TO authenticated USING (is_superadmin(auth.uid()));

CREATE POLICY "Superadmins delete client billing" ON public.client_billing
FOR DELETE TO authenticated USING (is_superadmin(auth.uid()));

CREATE TRIGGER trg_client_billing_updated
BEFORE UPDATE ON public.client_billing
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Payments log
CREATE TABLE public.client_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'EUR',
  paid_at timestamptz NOT NULL DEFAULT now(),
  note text,
  recorded_by_admin_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_payments_client ON public.client_payments(client_id, paid_at DESC);

ALTER TABLE public.client_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View client payments" ON public.client_payments
FOR SELECT TO authenticated
USING (
  client_id = current_profile_id()
  OR is_superadmin(auth.uid())
  OR (has_role(auth.uid(), 'admin'::app_role) AND admin_can_view_client(auth.uid(), client_id))
);

CREATE POLICY "Superadmins insert client payments" ON public.client_payments
FOR INSERT TO authenticated WITH CHECK (is_superadmin(auth.uid()));

CREATE POLICY "Superadmins update client payments" ON public.client_payments
FOR UPDATE TO authenticated USING (is_superadmin(auth.uid()));

CREATE POLICY "Superadmins delete client payments" ON public.client_payments
FOR DELETE TO authenticated USING (is_superadmin(auth.uid()));