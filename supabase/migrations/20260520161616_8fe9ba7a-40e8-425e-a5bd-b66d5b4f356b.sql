
-- Notify admin(s) when a new appointment is booked
CREATE OR REPLACE FUNCTION public.notify_admin_of_new_appointment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_user_id uuid;
  v_client_name text;
  v_title text;
  v_body text;
BEGIN
  SELECT COALESCE(full_name, first_name, 'A client') INTO v_client_name
  FROM public.profiles WHERE id = NEW.client_id;

  v_title := 'New appointment booked';
  v_body := COALESCE(v_client_name, 'A client') || ' booked a meeting on '
    || to_char(NEW.slot_start AT TIME ZONE 'Europe/Lisbon', 'Mon DD, HH24:MI');

  IF NEW.admin_id IS NOT NULL THEN
    SELECT user_id INTO v_admin_user_id FROM public.profiles WHERE id = NEW.admin_id;
    IF v_admin_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (recipient_user_id, audience, type, title, body, link_path, metadata)
      VALUES (v_admin_user_id, 'admin', 'appointment_booked', v_title, v_body, '/admin/appointments',
              jsonb_build_object('appointment_id', NEW.id, 'client_id', NEW.client_id));
      RETURN NEW;
    END IF;
  END IF;

  PERFORM public.notify_superadmins(
    'appointment_booked', v_title, v_body, '/admin/appointments',
    jsonb_build_object('appointment_id', NEW.id, 'client_id', NEW.client_id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_new_appointment ON public.appointments;
CREATE TRIGGER trg_notify_admin_new_appointment
AFTER INSERT ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_of_new_appointment();

-- Notify admin(s) when a client sends a new message
CREATE OR REPLACE FUNCTION public.notify_admin_of_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv RECORD;
  v_sender_profile RECORD;
  v_admin_user_id uuid;
  v_title text;
  v_body text;
BEGIN
  SELECT id, client_id, admin_id, subject INTO v_conv
  FROM public.conversations WHERE id = NEW.conversation_id;

  -- Only notify when the message comes from the client (not from admin)
  IF v_conv.client_id IS NULL OR NEW.sender_id <> v_conv.client_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, first_name, 'A client') AS name INTO v_sender_profile
  FROM public.profiles WHERE id = NEW.sender_id;

  v_title := 'New message from ' || COALESCE(v_sender_profile.name, 'a client');
  v_body := LEFT(NEW.body, 140);

  IF v_conv.admin_id IS NOT NULL THEN
    SELECT user_id INTO v_admin_user_id FROM public.profiles WHERE id = v_conv.admin_id;
    IF v_admin_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (recipient_user_id, audience, type, title, body, link_path, metadata)
      VALUES (v_admin_user_id, 'admin', 'new_client_message', v_title, v_body, '/admin/messages',
              jsonb_build_object('conversation_id', v_conv.id, 'message_id', NEW.id));
      RETURN NEW;
    END IF;
  END IF;

  PERFORM public.notify_superadmins(
    'new_client_message', v_title, v_body, '/admin/messages',
    jsonb_build_object('conversation_id', v_conv.id, 'message_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admin_new_message ON public.messages;
CREATE TRIGGER trg_notify_admin_new_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_of_new_message();
