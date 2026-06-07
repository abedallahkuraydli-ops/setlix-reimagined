CREATE OR REPLACE FUNCTION public.prevent_client_contract_tampering()
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
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.uploaded_by_admin_id IS DISTINCT FROM OLD.uploaded_by_admin_id
     OR NEW.contract_file_path IS DISTINCT FROM OLD.contract_file_path
     OR NEW.contract_file_name IS DISTINCT FROM OLD.contract_file_name
     OR NEW.contract_mime_type IS DISTINCT FROM OLD.contract_mime_type
     OR NEW.contract_file_size IS DISTINCT FROM OLD.contract_file_size
     OR NEW.signature_hash IS DISTINCT FROM OLD.signature_hash
     OR NEW.signed_ip IS DISTINCT FROM OLD.signed_ip
     OR NEW.signed_user_agent IS DISTINCT FROM OLD.signed_user_agent
     OR NEW.marked_signed_by_admin_id IS DISTINCT FROM OLD.marked_signed_by_admin_id
     OR NEW.marked_signed_at IS DISTINCT FROM OLD.marked_signed_at
     OR NEW.sealed_at IS DISTINCT FROM OLD.sealed_at
     OR NEW.notes IS DISTINCT FROM OLD.notes
  THEN
    RAISE EXCEPTION 'Clients cannot modify protected contract fields';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status <> 'pending_signature' OR NEW.status <> 'signed' THEN
      RAISE EXCEPTION 'Clients can only sign a pending contract';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_client_contract_tampering ON public.contracts;
CREATE TRIGGER trg_prevent_client_contract_tampering
BEFORE UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.prevent_client_contract_tampering();

DROP POLICY IF EXISTS "Clients notify admins" ON public.notifications;
CREATE POLICY "Clients notify admins"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  audience = 'admin'
  AND auth.uid() IS NOT NULL
  AND public.is_setlix_admin(recipient_user_id)
);