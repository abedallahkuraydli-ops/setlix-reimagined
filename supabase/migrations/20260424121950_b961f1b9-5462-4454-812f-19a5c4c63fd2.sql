
-- 1. Add download_purpose column to audit log
ALTER TABLE public.document_audit_log
  ADD COLUMN IF NOT EXISTS download_purpose text;

-- 2. Helper function: retention period per category
CREATE OR REPLACE FUNCTION public.retention_for_category(_category text)
RETURNS interval
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _category IN ('invoice', 'contract', 'signed_contract', 'setlix_issued', 'fiscal') THEN interval '10 years'
    WHEN _category = 'client_upload' THEN interval '5 years'
    ELSE interval '5 years'
  END
$$;

-- 3. Trigger: auto-set retention_until on insert when not explicitly provided
CREATE OR REPLACE FUNCTION public.set_document_retention()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.retention_until IS NULL OR NEW.retention_until = (now() + interval '10 years') THEN
    NEW.retention_until := now() + public.retention_for_category(NEW.category);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_document_retention ON public.documents;
CREATE TRIGGER trg_set_document_retention
  BEFORE INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_document_retention();

-- 4. Update log_document_action to accept and persist download_purpose
CREATE OR REPLACE FUNCTION public.log_document_action(
  _action text,
  _document_id uuid DEFAULT NULL::uuid,
  _document_request_id uuid DEFAULT NULL::uuid,
  _file_path text DEFAULT NULL::text,
  _file_name text DEFAULT NULL::text,
  _metadata jsonb DEFAULT NULL::jsonb,
  _ip_address text DEFAULT NULL::text,
  _user_agent text DEFAULT NULL::text,
  _download_purpose text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_target_user_id uuid;
  v_actor_role text;
  v_log_id uuid;
  v_authorized boolean := false;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  v_actor_role := CASE WHEN public.is_setlix_admin(v_user_id) THEN 'admin' ELSE 'client' END;

  IF _document_id IS NOT NULL THEN
    SELECT user_id INTO v_target_user_id FROM public.documents WHERE id = _document_id;
    IF v_target_user_id IS NULL THEN RAISE EXCEPTION 'Document not found'; END IF;
    v_authorized := (v_target_user_id = v_user_id OR public.is_superadmin(v_user_id)
      OR (public.has_role(v_user_id, 'admin'::public.app_role)
          AND public.admin_can_view_client(v_user_id, (SELECT id FROM public.profiles WHERE user_id = v_target_user_id LIMIT 1))));
  ELSIF _document_request_id IS NOT NULL THEN
    SELECT p.user_id INTO v_target_user_id FROM public.document_requests dr JOIN public.profiles p ON p.id = dr.client_id WHERE dr.id = _document_request_id;
    IF v_target_user_id IS NULL THEN RAISE EXCEPTION 'Document request not found'; END IF;
    v_authorized := (v_target_user_id = v_user_id OR public.is_superadmin(v_user_id)
      OR (public.has_role(v_user_id, 'admin'::public.app_role)
          AND public.admin_can_view_client(v_user_id, (SELECT id FROM public.profiles WHERE user_id = v_target_user_id LIMIT 1))));
  ELSE
    v_target_user_id := v_user_id; v_authorized := true;
  END IF;

  IF NOT v_authorized THEN RAISE EXCEPTION 'Not authorized to log this action'; END IF;

  INSERT INTO public.document_audit_log (
    actor_user_id, actor_role, target_user_id, document_id, document_request_id,
    file_path, file_name, action, metadata, ip_address, user_agent, download_purpose
  )
  VALUES (
    v_user_id, v_actor_role, v_target_user_id, _document_id, _document_request_id,
    _file_path, _file_name, _action, _metadata, _ip_address, _user_agent, _download_purpose
  )
  RETURNING id INTO v_log_id;
  RETURN v_log_id;
END;
$$;

-- 5. Enable extensions needed for scheduled purge (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
