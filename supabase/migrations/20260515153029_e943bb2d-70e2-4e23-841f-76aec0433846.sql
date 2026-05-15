-- 1. Enum + table
CREATE TYPE public.admin_permission AS ENUM (
  'edit_profile',
  'manage_appointments',
  'manage_invoices',
  'manage_documents',
  'manage_services',
  'manage_contracts',
  'manage_messages'
);

CREATE TABLE public.admin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  permission public.admin_permission NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (admin_user_id, permission)
);

ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view own permissions"
  ON public.admin_permissions FOR SELECT TO authenticated
  USING (admin_user_id = auth.uid() OR public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmins manage permissions"
  ON public.admin_permissions FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

-- 2. Helper function
CREATE OR REPLACE FUNCTION public.has_admin_permission(_user_id uuid, _permission public.admin_permission)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_superadmin(_user_id) OR EXISTS (
    SELECT 1 FROM public.admin_permissions
    WHERE admin_user_id = _user_id AND permission = _permission
  );
$$;

-- 3. Policies for granted capabilities (additive — superadmin policies remain)

-- profiles: edit_profile
CREATE POLICY "Admins with edit_profile can update allocated"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'edit_profile') AND public.admin_can_view_client(auth.uid(), id))
  WITH CHECK (public.has_admin_permission(auth.uid(), 'edit_profile') AND public.admin_can_view_client(auth.uid(), id));

-- appointments: manage_appointments
CREATE POLICY "Admins with manage_appointments update allocated"
  ON public.appointments FOR UPDATE TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'manage_appointments') AND public.admin_can_view_client(auth.uid(), client_id))
  WITH CHECK (public.has_admin_permission(auth.uid(), 'manage_appointments') AND public.admin_can_view_client(auth.uid(), client_id));
CREATE POLICY "Admins with manage_appointments delete allocated"
  ON public.appointments FOR DELETE TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'manage_appointments') AND public.admin_can_view_client(auth.uid(), client_id));

-- invoices: manage_invoices
CREATE POLICY "Admins with manage_invoices insert allocated"
  ON public.invoices FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_permission(auth.uid(), 'manage_invoices') AND public.admin_can_view_client(auth.uid(), client_id));
CREATE POLICY "Admins with manage_invoices update allocated"
  ON public.invoices FOR UPDATE TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'manage_invoices') AND public.admin_can_view_client(auth.uid(), client_id))
  WITH CHECK (public.has_admin_permission(auth.uid(), 'manage_invoices') AND public.admin_can_view_client(auth.uid(), client_id));
CREATE POLICY "Admins with manage_invoices delete allocated"
  ON public.invoices FOR DELETE TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'manage_invoices') AND public.admin_can_view_client(auth.uid(), client_id));

-- client_payments: manage_invoices
CREATE POLICY "Admins with manage_invoices insert payments"
  ON public.client_payments FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_permission(auth.uid(), 'manage_invoices') AND public.admin_can_view_client(auth.uid(), client_id));
CREATE POLICY "Admins with manage_invoices update payments"
  ON public.client_payments FOR UPDATE TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'manage_invoices') AND public.admin_can_view_client(auth.uid(), client_id))
  WITH CHECK (public.has_admin_permission(auth.uid(), 'manage_invoices') AND public.admin_can_view_client(auth.uid(), client_id));
CREATE POLICY "Admins with manage_invoices delete payments"
  ON public.client_payments FOR DELETE TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'manage_invoices') AND public.admin_can_view_client(auth.uid(), client_id));

-- client_billing: manage_invoices
CREATE POLICY "Admins with manage_invoices insert billing"
  ON public.client_billing FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_permission(auth.uid(), 'manage_invoices') AND public.admin_can_view_client(auth.uid(), client_id));
CREATE POLICY "Admins with manage_invoices update billing"
  ON public.client_billing FOR UPDATE TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'manage_invoices') AND public.admin_can_view_client(auth.uid(), client_id))
  WITH CHECK (public.has_admin_permission(auth.uid(), 'manage_invoices') AND public.admin_can_view_client(auth.uid(), client_id));
CREATE POLICY "Admins with manage_invoices delete billing"
  ON public.client_billing FOR DELETE TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'manage_invoices') AND public.admin_can_view_client(auth.uid(), client_id));

-- documents: manage_documents
CREATE POLICY "Admins with manage_documents insert"
  ON public.documents FOR INSERT TO authenticated
  WITH CHECK (
    public.has_admin_permission(auth.uid(), 'manage_documents')
    AND public.admin_can_view_client(auth.uid(), (SELECT id FROM public.profiles WHERE user_id = documents.user_id LIMIT 1))
  );
CREATE POLICY "Admins with manage_documents update"
  ON public.documents FOR UPDATE TO authenticated
  USING (
    public.has_admin_permission(auth.uid(), 'manage_documents')
    AND public.admin_can_view_client(auth.uid(), (SELECT id FROM public.profiles WHERE user_id = documents.user_id LIMIT 1))
  );
CREATE POLICY "Admins with manage_documents delete"
  ON public.documents FOR DELETE TO authenticated
  USING (
    public.has_admin_permission(auth.uid(), 'manage_documents')
    AND public.admin_can_view_client(auth.uid(), (SELECT id FROM public.profiles WHERE user_id = documents.user_id LIMIT 1))
  );

-- document_requests: manage_documents
CREATE POLICY "Admins with manage_documents insert requests"
  ON public.document_requests FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_permission(auth.uid(), 'manage_documents') AND public.admin_can_view_client(auth.uid(), client_id));
CREATE POLICY "Admins with manage_documents delete requests"
  ON public.document_requests FOR DELETE TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'manage_documents') AND public.admin_can_view_client(auth.uid(), client_id));

-- service_requests: manage_services
CREATE POLICY "Admins with manage_services update requests"
  ON public.service_requests FOR UPDATE TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'manage_services') AND public.admin_can_view_client(auth.uid(), client_id))
  WITH CHECK (public.has_admin_permission(auth.uid(), 'manage_services') AND public.admin_can_view_client(auth.uid(), client_id));

-- client_services: manage_services
CREATE POLICY "Admins with manage_services insert"
  ON public.client_services FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_permission(auth.uid(), 'manage_services') AND public.admin_can_view_client(auth.uid(), client_id));
CREATE POLICY "Admins with manage_services update"
  ON public.client_services FOR UPDATE TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'manage_services') AND public.admin_can_view_client(auth.uid(), client_id))
  WITH CHECK (public.has_admin_permission(auth.uid(), 'manage_services') AND public.admin_can_view_client(auth.uid(), client_id));
CREATE POLICY "Admins with manage_services delete"
  ON public.client_services FOR DELETE TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'manage_services') AND public.admin_can_view_client(auth.uid(), client_id));

-- contracts: manage_contracts
CREATE POLICY "Admins with manage_contracts insert"
  ON public.contracts FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_permission(auth.uid(), 'manage_contracts') AND public.admin_can_view_client(auth.uid(), client_id));
CREATE POLICY "Admins with manage_contracts update"
  ON public.contracts FOR UPDATE TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'manage_contracts') AND public.admin_can_view_client(auth.uid(), client_id))
  WITH CHECK (public.has_admin_permission(auth.uid(), 'manage_contracts') AND public.admin_can_view_client(auth.uid(), client_id));
CREATE POLICY "Admins with manage_contracts delete"
  ON public.contracts FOR DELETE TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'manage_contracts') AND public.admin_can_view_client(auth.uid(), client_id));

-- conversations: manage_messages (insert/update already broadly allowed for is_setlix_admin; add delete)
CREATE POLICY "Admins with manage_messages delete conversations"
  ON public.conversations FOR DELETE TO authenticated
  USING (public.has_admin_permission(auth.uid(), 'manage_messages') AND public.admin_can_view_client(auth.uid(), client_id));