
-- admin_settings: move SELECT policy from public role to authenticated
DROP POLICY IF EXISTS "Superadmins read admin settings" ON public.admin_settings;
CREATE POLICY "Superadmins read admin settings"
  ON public.admin_settings
  FOR SELECT
  TO authenticated
  USING (public.is_superadmin(auth.uid()));

-- contracts: move client UPDATE policy from public role to authenticated
DROP POLICY IF EXISTS "Clients update their own contract" ON public.contracts;
CREATE POLICY "Clients update their own contract"
  ON public.contracts
  FOR UPDATE
  TO authenticated
  USING (
    client_id = public.current_profile_id()
    AND status = 'pending_signature'
  )
  WITH CHECK (
    client_id = public.current_profile_id()
    AND status = ANY (ARRAY['pending_signature'::text, 'signed'::text])
  );
