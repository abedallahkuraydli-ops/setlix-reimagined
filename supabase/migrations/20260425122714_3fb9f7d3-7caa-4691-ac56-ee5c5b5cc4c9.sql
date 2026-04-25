-- Notifications table for both clients and admins
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL,
  audience text NOT NULL DEFAULT 'client', -- 'client' | 'admin'
  type text NOT NULL,                       -- e.g. service_added, payment_recorded, etc.
  title text NOT NULL,
  body text,
  link_path text,                           -- relative route to deep-link
  metadata jsonb,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(recipient_user_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Recipients can read their own notifications
CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (recipient_user_id = auth.uid());

-- Recipients can mark them as read (update)
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id = auth.uid());

-- Admins (any role) can insert notifications addressed to anyone (used to ping clients)
CREATE POLICY "Admins insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_setlix_admin(auth.uid()));

-- Clients can also insert notifications targeted at admins (for service requests)
CREATE POLICY "Clients notify admins"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (audience = 'admin' AND auth.uid() IS NOT NULL);

-- Superadmins can delete notifications (cleanup)
CREATE POLICY "Superadmins delete notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (public.is_superadmin(auth.uid()));

-- Helper: notify all superadmins about an event (used when a client makes a request)
CREATE OR REPLACE FUNCTION public.notify_superadmins(
  _type text,
  _title text,
  _body text,
  _link_path text,
  _metadata jsonb
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_user_id uuid;
BEGIN
  FOR v_user_id IN
    SELECT user_id FROM public.user_roles WHERE role = 'superadmin'::public.app_role
  LOOP
    INSERT INTO public.notifications (recipient_user_id, audience, type, title, body, link_path, metadata)
    VALUES (v_user_id, 'admin', _type, _title, _body, _link_path, _metadata);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- Trigger: when a service_request is created, notify all superadmins
CREATE OR REPLACE FUNCTION public.handle_new_service_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_name text;
  v_service_name text;
BEGIN
  SELECT COALESCE(full_name, NULLIF(TRIM(COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')), ''), 'A client')
    INTO v_client_name
  FROM public.profiles WHERE id = NEW.client_id;

  SELECT name INTO v_service_name FROM public.service_catalogue WHERE id = NEW.service_catalogue_id;

  PERFORM public.notify_superadmins(
    'service_request_new',
    'New service request',
    v_client_name || ' requested ' || COALESCE(v_service_name, 'a service'),
    '/admin/clients/' || NEW.client_id::text,
    jsonb_build_object(
      'request_id', NEW.id,
      'client_id', NEW.client_id,
      'service_catalogue_id', NEW.service_catalogue_id,
      'service_name', v_service_name
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_service_request_notify_admins
AFTER INSERT ON public.service_requests
FOR EACH ROW
WHEN (NEW.status = 'pending')
EXECUTE FUNCTION public.handle_new_service_request();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;