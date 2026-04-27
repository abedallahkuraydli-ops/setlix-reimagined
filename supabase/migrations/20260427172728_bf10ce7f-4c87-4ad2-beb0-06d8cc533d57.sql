-- 1. Sample client flag + default discount on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_sample BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_discount_percentage NUMERIC(5,2) NOT NULL DEFAULT 0
    CHECK (default_discount_percentage >= 0 AND default_discount_percentage <= 100);

-- 2. Monthly revenue view: invoices issued + payments received, excluding sample clients
CREATE OR REPLACE VIEW public.admin_monthly_revenue AS
WITH inv AS (
  SELECT
    date_trunc('month', i.created_at) AS month,
    SUM(i.amount_cents)::bigint AS invoiced_cents,
    i.currency
  FROM public.invoices i
  JOIN public.profiles p ON p.id = i.client_id
  WHERE p.is_sample = false
  GROUP BY 1, i.currency
),
pay AS (
  SELECT
    date_trunc('month', cp.paid_at) AS month,
    SUM(cp.amount_cents)::bigint AS received_cents,
    cp.currency
  FROM public.client_payments cp
  JOIN public.profiles p ON p.id = cp.client_id
  WHERE p.is_sample = false
  GROUP BY 1, cp.currency
)
SELECT
  COALESCE(inv.month, pay.month) AS month,
  COALESCE(inv.currency, pay.currency, 'EUR') AS currency,
  COALESCE(inv.invoiced_cents, 0) AS invoiced_cents,
  COALESCE(pay.received_cents, 0) AS received_cents
FROM inv
FULL OUTER JOIN pay
  ON inv.month = pay.month AND inv.currency = pay.currency
ORDER BY 1 DESC;

-- Restrict view to admins/superadmins via security_invoker so RLS on base tables applies
ALTER VIEW public.admin_monthly_revenue SET (security_invoker = true);