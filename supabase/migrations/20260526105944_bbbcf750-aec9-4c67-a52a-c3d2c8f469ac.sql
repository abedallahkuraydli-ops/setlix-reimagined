CREATE OR REPLACE FUNCTION public.get_or_create_invoice_for_service(_client_service_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_profile_id uuid;
  v_service RECORD;
  v_invoice_id uuid;
  v_unit_total bigint;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = v_user LIMIT 1;
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  SELECT cs.id, cs.client_id, cs.price_cents, cs.quantity, cs.vat_rate, cs.currency,
         cs.payment_status, sc.name AS service_name
  INTO v_service
  FROM public.client_services cs
  LEFT JOIN public.service_catalogue sc ON sc.id = cs.service_catalogue_id
  WHERE cs.id = _client_service_id;

  IF v_service.id IS NULL THEN
    RAISE EXCEPTION 'Service not found';
  END IF;
  IF v_service.client_id <> v_profile_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF v_service.payment_status = 'paid' THEN
    RAISE EXCEPTION 'Service already paid';
  END IF;
  IF COALESCE(v_service.price_cents, 0) <= 0 THEN
    RAISE EXCEPTION 'Service has no price';
  END IF;

  -- Try existing pending/failed invoice for this service
  SELECT id INTO v_invoice_id
  FROM public.invoices
  WHERE client_service_id = _client_service_id
    AND status IN ('pending', 'failed')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_invoice_id IS NOT NULL THEN
    RETURN v_invoice_id;
  END IF;

  v_unit_total := COALESCE(v_service.price_cents, 0)::bigint * COALESCE(v_service.quantity, 1)::bigint;

  INSERT INTO public.invoices (
    client_id, client_service_id, description, amount_cents,
    vat_rate, currency, status
  ) VALUES (
    v_profile_id,
    _client_service_id,
    COALESCE(v_service.service_name, 'Service') ||
      CASE WHEN COALESCE(v_service.quantity,1) > 1 THEN ' × ' || v_service.quantity ELSE '' END,
    v_unit_total::int,
    COALESCE(v_service.vat_rate, 23),
    COALESCE(v_service.currency, 'EUR'),
    'pending'
  )
  RETURNING id INTO v_invoice_id;

  RETURN v_invoice_id;
END;
$$;