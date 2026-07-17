
-- Per-client document categories, superadmin-managed
CREATE TABLE public.document_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_categories TO authenticated;
GRANT ALL ON public.document_categories TO service_role;

ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;

-- Superadmins fully manage
CREATE POLICY "Superadmins manage document categories"
  ON public.document_categories FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

-- Client can see their own categories
CREATE POLICY "Clients read own categories"
  ON public.document_categories FOR SELECT TO authenticated
  USING (client_id = public.current_profile_id());

-- Allocated admins can see their clients' categories
CREATE POLICY "Allocated admins read categories"
  ON public.document_categories FOR SELECT TO authenticated
  USING (public.admin_can_view_client(auth.uid(), client_id));

CREATE TRIGGER update_document_categories_updated_at
  BEFORE UPDATE ON public.document_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add category link on documents
ALTER TABLE public.documents
  ADD COLUMN category_id uuid NULL REFERENCES public.document_categories(id) ON DELETE SET NULL;

CREATE INDEX idx_documents_category_id ON public.documents(category_id);

-- Guard: only superadmin can change category_id, except a client tagging their OWN client_upload doc
CREATE OR REPLACE FUNCTION public.guard_document_category_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cat_client uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.category_id IS NOT DISTINCT FROM OLD.category_id THEN
    RETURN NEW;
  END IF;

  IF public.is_superadmin(auth.uid()) THEN
    -- ensure category belongs to the doc's owner
    IF NEW.category_id IS NOT NULL THEN
      SELECT client_id INTO v_cat_client FROM public.document_categories WHERE id = NEW.category_id;
      IF v_cat_client IS NULL THEN
        RAISE EXCEPTION 'Unknown category';
      END IF;
      IF v_cat_client <> (SELECT id FROM public.profiles WHERE user_id = NEW.user_id LIMIT 1) THEN
        RAISE EXCEPTION 'Category does not belong to this client';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Non-superadmin: only allow if inserter is the doc owner AND category belongs to them AND doc is client_upload
  IF NEW.category_id IS NULL THEN
    RETURN NEW; -- clearing not allowed for non-super
  END IF;

  IF NEW.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only superadmins can classify documents you do not own';
  END IF;

  IF COALESCE(NEW.category, '') <> 'client_upload' THEN
    RAISE EXCEPTION 'Only superadmins can classify Setlix-issued documents';
  END IF;

  SELECT client_id INTO v_cat_client FROM public.document_categories WHERE id = NEW.category_id;
  IF v_cat_client IS NULL OR v_cat_client <> public.current_profile_id() THEN
    RAISE EXCEPTION 'Invalid category for this client';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_documents_category_ins
  BEFORE INSERT ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.guard_document_category_change();

CREATE TRIGGER guard_documents_category_upd
  BEFORE UPDATE OF category_id ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.guard_document_category_change();
