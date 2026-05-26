
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS revolut_order_id text,
  ADD COLUMN IF NOT EXISTS revolut_order_token text,
  ADD COLUMN IF NOT EXISTS revolut_environment text,
  ADD COLUMN IF NOT EXISTS revolut_state text;

CREATE INDEX IF NOT EXISTS idx_invoices_revolut_order_id ON public.invoices(revolut_order_id);
