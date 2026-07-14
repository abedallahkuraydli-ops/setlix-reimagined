
-- Milestones per client
CREATE TABLE public.client_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  position integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','completed')),
  categories text[] NOT NULL DEFAULT '{}',
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_milestones_client ON public.client_milestones(client_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_milestones TO authenticated;
GRANT ALL ON public.client_milestones TO service_role;

ALTER TABLE public.client_milestones ENABLE ROW LEVEL SECURITY;

-- Clients read their own milestones
CREATE POLICY "Clients read own milestones" ON public.client_milestones
FOR SELECT TO authenticated
USING (client_id = public.current_profile_id() OR public.is_setlix_admin(auth.uid()));

-- Only superadmins can write
CREATE POLICY "Superadmins insert milestones" ON public.client_milestones
FOR INSERT TO authenticated
WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmins update milestones" ON public.client_milestones
FOR UPDATE TO authenticated
USING (public.is_superadmin(auth.uid()))
WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmins delete milestones" ON public.client_milestones
FOR DELETE TO authenticated
USING (public.is_superadmin(auth.uid()));

CREATE TRIGGER trg_client_milestones_updated
BEFORE UPDATE ON public.client_milestones
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add milestone_id on client_services
ALTER TABLE public.client_services
  ADD COLUMN milestone_id uuid REFERENCES public.client_milestones(id) ON DELETE SET NULL;

CREATE INDEX idx_client_services_milestone ON public.client_services(milestone_id);

-- Auto-assign service to milestone by category
CREATE OR REPLACE FUNCTION public.auto_assign_service_milestone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category text;
  v_milestone_id uuid;
BEGIN
  IF NEW.milestone_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  SELECT category INTO v_category FROM public.service_catalogue WHERE id = NEW.service_catalogue_id;
  IF v_category IS NULL THEN RETURN NEW; END IF;
  SELECT id INTO v_milestone_id
  FROM public.client_milestones
  WHERE client_id = NEW.client_id
    AND status <> 'completed'
    AND v_category = ANY(categories)
  ORDER BY position ASC LIMIT 1;
  NEW.milestone_id := v_milestone_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_assign_service_milestone
BEFORE INSERT ON public.client_services
FOR EACH ROW EXECUTE FUNCTION public.auto_assign_service_milestone();

-- RPC to complete a milestone and activate next
CREATE OR REPLACE FUNCTION public.complete_client_milestone(_milestone_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_client_id uuid;
  v_position int;
  v_open int;
  v_next uuid;
BEGIN
  IF NOT public.is_superadmin(v_uid) THEN
    RAISE EXCEPTION 'Only superadmins can complete milestones';
  END IF;
  SELECT client_id, position INTO v_client_id, v_position
  FROM public.client_milestones WHERE id = _milestone_id;
  IF v_client_id IS NULL THEN RAISE EXCEPTION 'Milestone not found'; END IF;

  SELECT count(*) INTO v_open
  FROM public.client_services
  WHERE milestone_id = _milestone_id AND status <> 'completed';
  IF v_open > 0 THEN
    RAISE EXCEPTION 'Milestone has % unfinished service(s)', v_open;
  END IF;

  UPDATE public.client_milestones
  SET status = 'completed', completed_at = now(), completed_by = v_uid, updated_at = now()
  WHERE id = _milestone_id;

  SELECT id INTO v_next
  FROM public.client_milestones
  WHERE client_id = v_client_id AND position > v_position AND status <> 'completed'
  ORDER BY position ASC LIMIT 1;

  IF v_next IS NOT NULL THEN
    UPDATE public.client_milestones SET status = 'active', updated_at = now() WHERE id = v_next;
  END IF;

  RETURN v_next;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_client_milestone(uuid) TO authenticated;
