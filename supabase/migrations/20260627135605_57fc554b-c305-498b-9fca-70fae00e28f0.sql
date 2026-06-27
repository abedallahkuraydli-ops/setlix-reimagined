
-- 1) admin_settings: superadmins only can read (bank details exposure)
DROP POLICY IF EXISTS "Admins read admin settings" ON public.admin_settings;
CREATE POLICY "Superadmins read admin settings"
  ON public.admin_settings FOR SELECT
  USING (public.is_superadmin(auth.uid()));

-- 2) contracts: tighten client UPDATE policy with WITH CHECK on status transition
DROP POLICY IF EXISTS "Clients update their own contract" ON public.contracts;
CREATE POLICY "Clients update their own contract"
  ON public.contracts FOR UPDATE
  USING (client_id = public.current_profile_id() AND status = 'pending_signature')
  WITH CHECK (
    client_id = public.current_profile_id()
    AND status IN ('pending_signature', 'signed')
  );
-- Column-level tampering already enforced by trigger prevent_client_contract_tampering.

-- 3) document_requests: restrict client UPDATE; enforce column immutability via trigger
DROP POLICY IF EXISTS "Clients update upload fields on their own requests" ON public.document_requests;
CREATE POLICY "Clients update upload fields on their own requests"
  ON public.document_requests FOR UPDATE
  USING (
    client_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.is_setlix_admin(auth.uid())
  )
  WITH CHECK (
    client_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.is_setlix_admin(auth.uid())
  );

CREATE OR REPLACE FUNCTION public.prevent_client_document_request_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_setlix_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.client_id IS DISTINCT FROM OLD.client_id
     OR NEW.service_id IS DISTINCT FROM OLD.service_id
     OR NEW.document_name IS DISTINCT FROM OLD.document_name
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.required IS DISTINCT FROM OLD.required
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Clients can only update upload fields on document requests';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_client_document_request_tampering ON public.document_requests;
CREATE TRIGGER trg_prevent_client_document_request_tampering
  BEFORE UPDATE ON public.document_requests
  FOR EACH ROW EXECUTE FUNCTION public.prevent_client_document_request_tampering();

-- 4) notifications: clients can only notify admins allocated to them (or superadmins)
DROP POLICY IF EXISTS "Clients notify admins" ON public.notifications;
CREATE POLICY "Clients notify their allocated admins"
  ON public.notifications FOR INSERT
  WITH CHECK (
    audience = 'admin'
    AND auth.uid() IS NOT NULL
    AND (
      public.is_superadmin(recipient_user_id)
      OR EXISTS (
        SELECT 1
        FROM public.admin_client_allocations a
        WHERE a.admin_user_id = recipient_user_id
          AND a.client_profile_id = public.current_profile_id()
      )
    )
  );
