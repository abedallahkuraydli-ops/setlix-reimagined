
CREATE TABLE public.guidebooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  mime_type text,
  uploaded_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.guidebooks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guidebooks TO authenticated;
GRANT ALL ON public.guidebooks TO service_role;

ALTER TABLE public.guidebooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view guidebooks"
  ON public.guidebooks FOR SELECT
  USING (true);

CREATE POLICY "Superadmins can insert guidebooks"
  ON public.guidebooks FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmins can update guidebooks"
  ON public.guidebooks FOR UPDATE TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmins can delete guidebooks"
  ON public.guidebooks FOR DELETE TO authenticated
  USING (public.is_superadmin(auth.uid()));

CREATE TRIGGER update_guidebooks_updated_at
  BEFORE UPDATE ON public.guidebooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for guidebooks bucket (bucket itself is created via the storage tool)
CREATE POLICY "Public can read guidebooks files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'guidebooks');

CREATE POLICY "Superadmins can upload guidebooks files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'guidebooks' AND public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmins can update guidebooks files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'guidebooks' AND public.is_superadmin(auth.uid()))
  WITH CHECK (bucket_id = 'guidebooks' AND public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmins can delete guidebooks files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'guidebooks' AND public.is_superadmin(auth.uid()));
