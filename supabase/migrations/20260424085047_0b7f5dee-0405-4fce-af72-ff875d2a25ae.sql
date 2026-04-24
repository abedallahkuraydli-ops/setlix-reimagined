
-- =====================================================================
-- CONSOLIDATED PORTAL MIGRATION (v2 — fixed ordering)
-- =====================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ENUMS
DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('superadmin','admin','client'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.service_status AS ENUM ('requested','in_review','in_progress','awaiting_client','completed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.conversation_status AS ENUM ('open','closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.appointment_status AS ENUM ('pending','confirmed','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.client_service_payment_status AS ENUM ('unpaid','paid','refunded','not_required'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.invoice_status AS ENUM ('draft','pending','paid','failed','refunded','cancelled','partially_refunded'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.service_request_status AS ENUM ('pending','approved','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.dsr_type AS ENUM ('access','rectification','erasure','portability','restriction','objection'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.dsr_status AS ENUM ('pending','in_progress','fulfilled','rejected','withdrawn'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.breach_status AS ENUM ('detected','assessing','contained','notified','closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.breach_severity AS ENUM ('low','medium','high','critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- PROFILES (table only; admin policy added after admin_client_allocations exists)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT, first_name TEXT, last_name TEXT,
  date_of_birth DATE, nationality TEXT, phone_number TEXT, nif TEXT,
  company_name TEXT, meet_link TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  lifecycle_status TEXT NOT NULL DEFAULT 'active' CHECK (lifecycle_status IN ('active','completed','deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- USER_ROLES + helpers
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'superadmin'::public.app_role)
$$;
CREATE OR REPLACE FUNCTION public.is_admin_or_super(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'superadmin'::public.app_role) OR public.has_role(_user_id, 'admin'::public.app_role)
$$;
CREATE OR REPLACE FUNCTION public.is_setlix_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin_or_super(_user_id)
$$;
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE POLICY "Users view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmins insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmins delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.is_superadmin(auth.uid()));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name) VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  IF NEW.email ILIKE '%@setlix.pt' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'superadmin'::public.app_role) ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client'::public.app_role) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ADMIN ↔ CLIENT ALLOCATIONS
CREATE TABLE public.admin_client_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (admin_user_id, client_profile_id)
);
ALTER TABLE public.admin_client_allocations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.admin_can_view_client(_admin_user_id UUID, _client_profile_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_superadmin(_admin_user_id)
    OR EXISTS (SELECT 1 FROM public.admin_client_allocations WHERE admin_user_id = _admin_user_id AND client_profile_id = _client_profile_id)
$$;
CREATE POLICY "Superadmins manage allocations" ON public.admin_client_allocations FOR ALL TO authenticated USING (public.is_superadmin(auth.uid())) WITH CHECK (public.is_superadmin(auth.uid()));
CREATE POLICY "Admins view their own allocations" ON public.admin_client_allocations FOR SELECT TO authenticated USING (admin_user_id = auth.uid() OR public.is_superadmin(auth.uid()));

-- Now safe to add admin policies on profiles
CREATE POLICY "Admins view allocated profiles" ON public.profiles FOR SELECT TO authenticated USING (
  public.is_superadmin(auth.uid())
  OR (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.admin_can_view_client(auth.uid(), id))
);
CREATE POLICY "Superadmins update profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.is_superadmin(auth.uid()));

-- ADMIN SETTINGS
CREATE TABLE public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  working_hours_start INTEGER NOT NULL DEFAULT 9 CHECK (working_hours_start BETWEEN 0 AND 23),
  working_hours_end INTEGER NOT NULL DEFAULT 18 CHECK (working_hours_end BETWEEN 1 AND 24),
  working_days INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
  slot_duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (slot_duration_minutes > 0),
  timezone TEXT NOT NULL DEFAULT 'Europe/Lisbon',
  bank_name TEXT, bank_account_holder TEXT, bank_iban TEXT, bank_bic TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read admin settings" ON public.admin_settings FOR SELECT TO authenticated USING (public.is_admin_or_super(auth.uid()));
CREATE POLICY "Superadmins insert admin settings" ON public.admin_settings FOR INSERT TO authenticated WITH CHECK (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmins update admin settings" ON public.admin_settings FOR UPDATE TO authenticated USING (public.is_superadmin(auth.uid()));
CREATE TRIGGER admin_settings_updated_at BEFORE UPDATE ON public.admin_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.admin_settings (working_hours_start, working_hours_end, working_days, slot_duration_minutes, timezone, bank_name, bank_account_holder, bank_iban, bank_bic)
VALUES (9, 18, ARRAY[1,2,3,4,5], 30, 'Europe/Lisbon', 'Millennium BCP', 'Inconstant Scape Unip Lda', 'PT50 0033 0000 4579 9951 6510 5', 'BCOMPTPL');

CREATE OR REPLACE FUNCTION public.get_company_bank_details()
RETURNS TABLE (bank_name text, bank_account_holder text, bank_iban text, bank_bic text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT bank_name, bank_account_holder, bank_iban, bank_bic FROM public.admin_settings ORDER BY updated_at DESC LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.get_company_bank_details() TO authenticated;

-- ACCOUNT DELETION REQUESTS
CREATE TABLE public.account_deletion_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','completed')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ, processed_by UUID, admin_notes TEXT
);
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users create their own deletion requests" ON public.account_deletion_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users view their own deletion requests" ON public.account_deletion_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_setlix_admin(auth.uid()));
CREATE POLICY "Superadmins update deletion requests" ON public.account_deletion_requests FOR UPDATE TO authenticated USING (public.is_superadmin(auth.uid()));

-- SERVICE CATALOGUE
CREATE TABLE public.service_catalogue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, category TEXT NOT NULL, description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  price_cents INTEGER, vat_rate NUMERIC(5,2) NOT NULL DEFAULT 23.00, currency TEXT NOT NULL DEFAULT 'EUR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.service_catalogue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read service catalogue" ON public.service_catalogue FOR SELECT TO authenticated USING (true);
CREATE POLICY "Superadmins insert service catalogue" ON public.service_catalogue FOR INSERT TO authenticated WITH CHECK (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmins update service catalogue" ON public.service_catalogue FOR UPDATE TO authenticated USING (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmins delete service catalogue" ON public.service_catalogue FOR DELETE TO authenticated USING (public.is_superadmin(auth.uid()));
INSERT INTO public.service_catalogue (name, category, description) VALUES
  ('Confirming your visa document', 'Administrative Services', 'Complete your legal setup from confirming your visa documents.'),
  ('Assisting in obtaining a visa appointment', 'Administrative Services', 'Assistance with visa appointment scheduling.'),
  ('Tax and social security registration', 'Administrative Services', 'Registration with tax and social security authorities.'),
  ('Legal and Contractual Documentation', 'Administrative Services', 'Legal documentation and contract support.'),
  ('On demand legal Assistance', 'Administrative Services', 'Legal assistance when you need it.'),
  ('Bank Account Opening', 'Financial Services', 'Bank account setup in Portugal.'),
  ('Tax Planning and Yearly IRS Filing', 'Financial Services', 'Tax planning and annual IRS filing.'),
  ('Bookkeeping', 'Financial Services', 'Bookkeeping and financial record management.'),
  ('Financial Consulting', 'Financial Services', 'Expert financial consulting services.'),
  ('Private Monthly Accountant', 'Financial Services', 'Dedicated monthly accountant.'),
  ('House and/or Office Scouting', 'Relocation Services', 'Property and office search support.'),
  ('Access to Portuguese Lessons', 'Relocation Services', 'Portuguese language learning access.'),
  ('Access to Healthcare Support', 'Relocation Services', 'Healthcare support and guidance.'),
  ('Airport Pickups', 'Relocation Services', 'Airport pickup coordination.'),
  ('Residence Permit Application Support', 'Relocation Services', 'Residence permit application assistance.'),
  ('Access to networking events', 'Community & Networking', 'Networking event access.'),
  ('Discounted wine tours', 'Community & Networking', 'Wine tour discounts.'),
  ('Tour-guided sightseeing', 'Community & Networking', 'Guided sightseeing tours.'),
  ('Monthly trips to discover Portugal', 'Community & Networking', 'Monthly discovery trips.'),
  ('Initial Eligibility Assessment & Strategy', 'Golden Visa', 'Eligibility assessment and strategy for Golden Visa.'),
  ('Investment Advisory & Opportunity Sourcing', 'Golden Visa', 'Investment advisory for Golden Visa.'),
  ('Legal Structuring & Immigration Support', 'Golden Visa', 'Legal and immigration support for Golden Visa.'),
  ('Tax Advisory & Compliance', 'Golden Visa', 'Tax advisory for Golden Visa compliance.'),
  ('Banking & Financial Setup', 'Golden Visa', 'Banking setup for Golden Visa.'),
  ('End-to-End Application Management', 'Golden Visa', 'Full application management for Golden Visa.');

-- CLIENT SERVICES
CREATE TABLE public.client_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_catalogue_id UUID NOT NULL REFERENCES public.service_catalogue(id) ON DELETE CASCADE,
  status public.service_status NOT NULL DEFAULT 'requested',
  progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  notes TEXT, assigned_admin_id UUID REFERENCES public.profiles(id),
  price_cents INTEGER, vat_rate NUMERIC(5,2), currency TEXT DEFAULT 'EUR',
  payment_status public.client_service_payment_status NOT NULL DEFAULT 'unpaid',
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View client services" ON public.client_services FOR SELECT TO authenticated USING (
  client_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.is_superadmin(auth.uid())
  OR (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.admin_can_view_client(auth.uid(), client_id))
);
CREATE POLICY "Superadmins insert client services" ON public.client_services FOR INSERT TO authenticated WITH CHECK (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmins update client services" ON public.client_services FOR UPDATE TO authenticated USING (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmins delete client services" ON public.client_services FOR DELETE TO authenticated USING (public.is_superadmin(auth.uid()));
CREATE TRIGGER update_client_services_updated_at BEFORE UPDATE ON public.client_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SERVICE REQUESTS
CREATE TABLE public.service_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL, service_catalogue_id UUID NOT NULL,
  client_note TEXT,
  status public.service_request_status NOT NULL DEFAULT 'pending',
  reviewed_by_admin_id UUID, reviewed_at TIMESTAMPTZ, decision_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_service_requests_client ON public.service_requests(client_id);
CREATE INDEX idx_service_requests_status ON public.service_requests(status);
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View service requests" ON public.service_requests FOR SELECT TO authenticated USING (
  client_id = public.current_profile_id()
  OR public.is_superadmin(auth.uid())
  OR (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.admin_can_view_client(auth.uid(), client_id))
);
CREATE POLICY "Clients create their own requests" ON public.service_requests FOR INSERT TO authenticated WITH CHECK (client_id = public.current_profile_id() AND status = 'pending');
CREATE POLICY "Clients delete own pending requests" ON public.service_requests FOR DELETE TO authenticated USING (client_id = public.current_profile_id() AND status = 'pending');
CREATE POLICY "Superadmins update service requests" ON public.service_requests FOR UPDATE TO authenticated USING (public.is_superadmin(auth.uid())) WITH CHECK (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmins delete service requests" ON public.service_requests FOR DELETE TO authenticated USING (public.is_superadmin(auth.uid()));
CREATE TRIGGER trg_service_requests_updated_at BEFORE UPDATE ON public.service_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_service_request_approval()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_price_cents INTEGER; v_vat_rate NUMERIC; v_currency TEXT;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    SELECT price_cents, vat_rate, currency INTO v_price_cents, v_vat_rate, v_currency
    FROM public.service_catalogue WHERE id = NEW.service_catalogue_id;
    INSERT INTO public.client_services (client_id, service_catalogue_id, status, payment_status, price_cents, vat_rate, currency, quantity, progress_percentage)
    VALUES (NEW.client_id, NEW.service_catalogue_id, 'requested', 'unpaid', v_price_cents, v_vat_rate, COALESCE(v_currency, 'EUR'), 1, 0);
    NEW.reviewed_at := COALESCE(NEW.reviewed_at, now());
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_service_request_approval BEFORE UPDATE ON public.service_requests FOR EACH ROW EXECUTE FUNCTION public.handle_service_request_approval();

-- CONVERSATIONS + MESSAGES
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  subject TEXT,
  status public.conversation_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_conversations_client_id ON public.conversations(client_id);
CREATE INDEX idx_conversations_last_message_at ON public.conversations(last_message_at DESC);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(trim(body)) > 0),
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id, created_at);
CREATE INDEX idx_messages_unread ON public.messages(conversation_id) WHERE read = false;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View conversations" ON public.conversations FOR SELECT TO authenticated USING (
  client_id = public.current_profile_id()
  OR public.is_superadmin(auth.uid())
  OR (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.admin_can_view_client(auth.uid(), client_id))
);
CREATE POLICY "Clients create their own conversations" ON public.conversations FOR INSERT TO authenticated WITH CHECK (client_id = public.current_profile_id() OR public.is_setlix_admin(auth.uid()));
CREATE POLICY "Clients and admins update conversations" ON public.conversations FOR UPDATE TO authenticated USING (client_id = public.current_profile_id() OR public.is_setlix_admin(auth.uid()));
CREATE POLICY "Superadmins delete conversations" ON public.conversations FOR DELETE TO authenticated USING (public.is_superadmin(auth.uid()));

CREATE POLICY "View messages in own conversations" ON public.messages FOR SELECT TO authenticated USING (
  public.is_setlix_admin(auth.uid())
  OR conversation_id IN (SELECT id FROM public.conversations WHERE client_id = public.current_profile_id())
);
CREATE POLICY "Send messages in own conversations" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  sender_id = public.current_profile_id() AND (
    public.is_setlix_admin(auth.uid())
    OR conversation_id IN (SELECT id FROM public.conversations WHERE client_id = public.current_profile_id() AND status = 'open')
  )
);
CREATE POLICY "Update messages (mark as read)" ON public.messages FOR UPDATE TO authenticated USING (
  public.is_setlix_admin(auth.uid())
  OR conversation_id IN (SELECT id FROM public.conversations WHERE client_id = public.current_profile_id())
);

CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_client_id UUID; v_is_admin BOOLEAN;
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  SELECT client_id INTO v_client_id FROM public.conversations WHERE id = NEW.conversation_id;
  v_is_admin := (NEW.sender_id <> v_client_id);
  IF v_is_admin THEN
    UPDATE public.messages SET read = true
    WHERE conversation_id = NEW.conversation_id AND sender_id = v_client_id AND read = false AND id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_new_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();

-- APPOINTMENTS
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  slot_start TIMESTAMPTZ NOT NULL, slot_end TIMESTAMPTZ NOT NULL,
  status public.appointment_status NOT NULL DEFAULT 'pending',
  google_event_id TEXT, notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT slot_end_after_start CHECK (slot_end > slot_start)
);
CREATE INDEX idx_appointments_client_id ON public.appointments(client_id);
CREATE INDEX idx_appointments_slot_start ON public.appointments(slot_start);
CREATE INDEX idx_appointments_status ON public.appointments(status);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View appointments" ON public.appointments FOR SELECT TO authenticated USING (
  client_id = public.current_profile_id()
  OR public.is_superadmin(auth.uid())
  OR (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.admin_can_view_client(auth.uid(), client_id))
);
CREATE POLICY "Clients create their own appointments" ON public.appointments FOR INSERT TO authenticated WITH CHECK (client_id = public.current_profile_id() OR public.is_setlix_admin(auth.uid()));
CREATE POLICY "Clients update their own appointments" ON public.appointments FOR UPDATE TO authenticated USING (client_id = public.current_profile_id()) WITH CHECK (client_id = public.current_profile_id());
CREATE POLICY "Superadmins update appointments" ON public.appointments FOR UPDATE TO authenticated USING (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmins delete appointments" ON public.appointments FOR DELETE TO authenticated USING (public.is_superadmin(auth.uid()));
CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- DOCUMENTS
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL, file_path TEXT NOT NULL, file_size BIGINT,
  category TEXT NOT NULL DEFAULT 'client_upload' CHECK (category IN ('client_upload','setlix_issued')),
  retention_until TIMESTAMPTZ DEFAULT (now() + interval '10 years'),
  uploaded_by_admin_id UUID, mime_type TEXT, sha256_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own documents" ON public.documents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own uploads" ON public.documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND category = 'client_upload');
CREATE POLICY "Users can delete their own uploads" ON public.documents FOR DELETE TO authenticated USING (auth.uid() = user_id AND category = 'client_upload');
CREATE POLICY "Admins view allocated documents" ON public.documents FOR SELECT TO authenticated USING (
  public.is_superadmin(auth.uid())
  OR (public.has_role(auth.uid(), 'admin'::public.app_role)
      AND public.admin_can_view_client(auth.uid(), (SELECT id FROM public.profiles WHERE user_id = documents.user_id)))
);
CREATE POLICY "Superadmins insert issued documents" ON public.documents FOR INSERT TO authenticated WITH CHECK (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmins update documents" ON public.documents FOR UPDATE TO authenticated USING (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmins delete documents" ON public.documents FOR DELETE TO authenticated USING (public.is_superadmin(auth.uid()));
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.document_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.client_services(id) ON DELETE SET NULL,
  document_name TEXT NOT NULL, description TEXT, required BOOLEAN NOT NULL DEFAULT true,
  uploaded_file_url TEXT, uploaded_at TIMESTAMPTZ, uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View document requests" ON public.document_requests FOR SELECT TO authenticated USING (
  client_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  OR public.is_superadmin(auth.uid())
  OR (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.admin_can_view_client(auth.uid(), client_id))
);
CREATE POLICY "Clients update upload fields on their own requests" ON public.document_requests FOR UPDATE TO authenticated USING (
  client_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR public.is_setlix_admin(auth.uid())
);
CREATE POLICY "Superadmins insert document requests" ON public.document_requests FOR INSERT TO authenticated WITH CHECK (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmins delete document requests" ON public.document_requests FOR DELETE TO authenticated USING (public.is_superadmin(auth.uid()));

CREATE TABLE public.document_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID, document_request_id UUID,
  file_path TEXT, file_name TEXT,
  action TEXT NOT NULL CHECK (action IN ('upload','download','view','delete','admin_upload','admin_download','admin_delete')),
  actor_user_id UUID,
  actor_role TEXT NOT NULL DEFAULT 'client' CHECK (actor_role IN ('client','admin','system')),
  target_user_id UUID, ip_address TEXT, user_agent TEXT, metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_document_id ON public.document_audit_log(document_id);
CREATE INDEX idx_audit_actor ON public.document_audit_log(actor_user_id);
CREATE INDEX idx_audit_target ON public.document_audit_log(target_user_id);
CREATE INDEX idx_audit_created_at ON public.document_audit_log(created_at DESC);
ALTER TABLE public.document_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view all audit logs" ON public.document_audit_log FOR SELECT TO authenticated USING (public.is_setlix_admin(auth.uid()));
CREATE POLICY "Clients view their own audit logs" ON public.document_audit_log FOR SELECT TO authenticated USING (actor_user_id = auth.uid() OR target_user_id = auth.uid());
CREATE POLICY "Admins insert audit logs directly" ON public.document_audit_log FOR INSERT TO authenticated WITH CHECK (public.is_setlix_admin(auth.uid()));

CREATE TABLE public.document_download_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  authorised BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (admin_user_id, document_id)
);
ALTER TABLE public.document_download_permissions ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.admin_can_download_document(_admin_user_id UUID, _document_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_superadmin(_admin_user_id)
    OR EXISTS (SELECT 1 FROM public.document_download_permissions WHERE admin_user_id = _admin_user_id AND document_id = _document_id AND authorised = true)
$$;
CREATE POLICY "Superadmins manage doc permissions" ON public.document_download_permissions FOR ALL TO authenticated USING (public.is_superadmin(auth.uid())) WITH CHECK (public.is_superadmin(auth.uid()));
CREATE POLICY "Admins view their own doc permissions" ON public.document_download_permissions FOR SELECT TO authenticated USING (admin_user_id = auth.uid() OR public.is_superadmin(auth.uid()));

CREATE TABLE public.unauthorised_download_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  document_name TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged BOOLEAN NOT NULL DEFAULT false
);
ALTER TABLE public.unauthorised_download_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated insert attempts" ON public.unauthorised_download_attempts FOR INSERT TO authenticated WITH CHECK (admin_user_id = auth.uid());
CREATE POLICY "Superadmins view attempts" ON public.unauthorised_download_attempts FOR SELECT TO authenticated USING (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmins update attempts" ON public.unauthorised_download_attempts FOR UPDATE TO authenticated USING (public.is_superadmin(auth.uid()));

CREATE OR REPLACE FUNCTION public.log_document_action(
  _action text, _document_id uuid DEFAULT NULL, _document_request_id uuid DEFAULT NULL,
  _file_path text DEFAULT NULL, _file_name text DEFAULT NULL, _metadata jsonb DEFAULT NULL,
  _ip_address text DEFAULT NULL, _user_agent text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid(); v_target_user_id uuid; v_actor_role text; v_log_id uuid; v_authorized boolean := false;
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
  INSERT INTO public.document_audit_log (actor_user_id, actor_role, target_user_id, document_id, document_request_id, file_path, file_name, action, metadata, ip_address, user_agent)
  VALUES (v_user_id, v_actor_role, v_target_user_id, _document_id, _document_request_id, _file_path, _file_name, _action, _metadata, _ip_address, _user_agent)
  RETURNING id INTO v_log_id;
  RETURN v_log_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.log_document_action(text, uuid, uuid, text, text, jsonb, text, text) TO authenticated;

-- CONSENT LOG
CREATE TABLE public.consent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  consent_type TEXT NOT NULL, policy_version TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  ip_address TEXT, user_agent TEXT, metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_consent_log_user ON public.consent_log(user_id, created_at DESC);
ALTER TABLE public.consent_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own consents" ON public.consent_log FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_setlix_admin(auth.uid()));
CREATE POLICY "Users insert own consents" ON public.consent_log FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- CONTRACTS
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  uploaded_by_admin_id UUID,
  contract_file_path TEXT NOT NULL, contract_file_name TEXT NOT NULL,
  contract_mime_type TEXT, contract_file_size BIGINT,
  status TEXT NOT NULL DEFAULT 'pending_signature' CHECK (status IN ('pending_signature','signed','superseded')),
  signature_method TEXT CHECK (signature_method IS NULL OR signature_method IN ('typed','drawn','uploaded','admin_marked')),
  signature_typed_name TEXT, signature_drawn_data_url TEXT,
  signed_file_path TEXT, signed_file_name TEXT,
  signed_at TIMESTAMPTZ, signed_ip TEXT, signed_user_agent TEXT,
  marked_signed_by_admin_id UUID, marked_signed_at TIMESTAMPTZ,
  signature_hash TEXT, sealed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_contracts_client_id ON public.contracts(client_id);
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View contracts" ON public.contracts FOR SELECT TO authenticated USING (
  client_id = public.current_profile_id()
  OR public.is_superadmin(auth.uid())
  OR (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.admin_can_view_client(auth.uid(), client_id))
);
CREATE POLICY "Clients update their own contract" ON public.contracts FOR UPDATE TO authenticated USING (client_id = public.current_profile_id());
CREATE POLICY "Superadmins insert contracts" ON public.contracts FOR INSERT TO authenticated WITH CHECK (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmins update contracts" ON public.contracts FOR UPDATE TO authenticated USING (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmins delete contracts" ON public.contracts FOR DELETE TO authenticated USING (public.is_superadmin(auth.uid()));
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- INVOICES + PAYMENTS + REFUNDS
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL, client_service_id UUID, created_by_admin_id UUID,
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  vat_rate NUMERIC(5,2) NOT NULL DEFAULT 23.00, currency TEXT NOT NULL DEFAULT 'EUR',
  discount_percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_percentage BETWEEN 0 AND 100),
  status public.invoice_status NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id TEXT, stripe_checkout_session_id TEXT, paid_at TIMESTAMPTZ,
  moloni_document_id TEXT, moloni_document_number TEXT, moloni_pdf_url TEXT,
  moloni_issued_at TIMESTAMPTZ, moloni_error TEXT,
  refunded_amount_cents INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoices_client ON public.invoices(client_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View invoices" ON public.invoices FOR SELECT TO authenticated USING (
  client_id = public.current_profile_id()
  OR public.is_superadmin(auth.uid())
  OR (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.admin_can_view_client(auth.uid(), client_id))
);
CREATE POLICY "Superadmins insert invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmins update invoices" ON public.invoices FOR UPDATE TO authenticated USING (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmins delete invoices" ON public.invoices FOR DELETE TO authenticated USING (public.is_superadmin(auth.uid()));
CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.protect_issued_invoice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.moloni_document_id IS NOT NULL THEN
    IF NEW.amount_cents IS DISTINCT FROM OLD.amount_cents
    OR NEW.currency IS DISTINCT FROM OLD.currency
    OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.vat_rate IS DISTINCT FROM OLD.vat_rate
    OR NEW.discount_percentage IS DISTINCT FROM OLD.discount_percentage
    OR NEW.client_id IS DISTINCT FROM OLD.client_id
    OR NEW.client_service_id IS DISTINCT FROM OLD.client_service_id
    OR NEW.moloni_document_id IS DISTINCT FROM OLD.moloni_document_id
    OR NEW.moloni_document_number IS DISTINCT FROM OLD.moloni_document_number
    THEN
      RAISE EXCEPTION 'Issued invoice (doc %) is immutable. Use a credit note (refund) to correct it.', OLD.moloni_document_number;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_protect_issued_invoice BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.protect_issued_invoice();

CREATE OR REPLACE FUNCTION public.block_issued_invoice_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.moloni_document_id IS NOT NULL THEN
    RAISE EXCEPTION 'Issued invoice (doc %) cannot be deleted. Use a credit note instead.', OLD.moloni_document_number;
  END IF;
  RETURN OLD;
END;
$$;
CREATE TRIGGER trg_block_issued_invoice_delete BEFORE DELETE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.block_issued_invoice_delete();

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  client_id UUID,
  stripe_payment_intent_id TEXT UNIQUE, stripe_checkout_session_id TEXT,
  amount_cents INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'EUR',
  payment_method TEXT, status TEXT NOT NULL,
  stripe_event_id TEXT UNIQUE, raw_event JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX idx_payments_client ON public.payments(client_id);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View payments" ON public.payments FOR SELECT TO authenticated USING (
  client_id = public.current_profile_id()
  OR public.is_superadmin(auth.uid())
  OR (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.admin_can_view_client(auth.uid(), client_id))
);
CREATE POLICY "Superadmins manage payments" ON public.payments FOR ALL TO authenticated USING (public.is_superadmin(auth.uid())) WITH CHECK (public.is_superadmin(auth.uid()));

CREATE TABLE public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  client_id UUID NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'EUR', reason TEXT,
  stripe_refund_id TEXT,
  moloni_credit_note_id TEXT, moloni_credit_note_number TEXT, moloni_credit_note_pdf_url TEXT, moloni_error TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  issued_by_admin_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refunds_invoice ON public.refunds(invoice_id);
CREATE INDEX idx_refunds_client ON public.refunds(client_id);
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View refunds" ON public.refunds FOR SELECT TO authenticated USING (
  client_id = public.current_profile_id()
  OR public.is_superadmin(auth.uid())
  OR (public.has_role(auth.uid(), 'admin'::public.app_role) AND public.admin_can_view_client(auth.uid(), client_id))
);
CREATE POLICY "Superadmins insert refunds" ON public.refunds FOR INSERT TO authenticated WITH CHECK (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmins update refunds" ON public.refunds FOR UPDATE TO authenticated USING (public.is_superadmin(auth.uid()));
CREATE TRIGGER trg_refunds_updated_at BEFORE UPDATE ON public.refunds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PROFILE AUDIT LOG + lifecycle trigger
CREATE TABLE public.profile_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL,
  changed_by_user_id UUID,
  changed_fields JSONB NOT NULL,
  old_values JSONB, new_values JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profile_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view profile audit log" ON public.profile_audit_log FOR SELECT TO authenticated USING (public.is_setlix_admin(auth.uid()));
CREATE POLICY "Users view their own profile audit log" ON public.profile_audit_log FOR SELECT TO authenticated USING (
  profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE OR REPLACE FUNCTION public.log_profile_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_changed jsonb := '{}'::jsonb; v_old jsonb := '{}'::jsonb; v_new jsonb := '{}'::jsonb;
BEGIN
  IF NEW.first_name IS DISTINCT FROM OLD.first_name THEN v_changed := v_changed || jsonb_build_object('first_name', true); v_old := v_old || jsonb_build_object('first_name', OLD.first_name); v_new := v_new || jsonb_build_object('first_name', NEW.first_name); END IF;
  IF NEW.last_name IS DISTINCT FROM OLD.last_name THEN v_changed := v_changed || jsonb_build_object('last_name', true); v_old := v_old || jsonb_build_object('last_name', OLD.last_name); v_new := v_new || jsonb_build_object('last_name', NEW.last_name); END IF;
  IF NEW.full_name IS DISTINCT FROM OLD.full_name THEN v_changed := v_changed || jsonb_build_object('full_name', true); v_old := v_old || jsonb_build_object('full_name', OLD.full_name); v_new := v_new || jsonb_build_object('full_name', NEW.full_name); END IF;
  IF NEW.phone_number IS DISTINCT FROM OLD.phone_number THEN v_changed := v_changed || jsonb_build_object('phone_number', true); v_old := v_old || jsonb_build_object('phone_number', OLD.phone_number); v_new := v_new || jsonb_build_object('phone_number', NEW.phone_number); END IF;
  IF NEW.nationality IS DISTINCT FROM OLD.nationality THEN v_changed := v_changed || jsonb_build_object('nationality', true); v_old := v_old || jsonb_build_object('nationality', OLD.nationality); v_new := v_new || jsonb_build_object('nationality', NEW.nationality); END IF;
  IF NEW.nif IS DISTINCT FROM OLD.nif THEN v_changed := v_changed || jsonb_build_object('nif', true); v_old := v_old || jsonb_build_object('nif', OLD.nif); v_new := v_new || jsonb_build_object('nif', NEW.nif); END IF;
  IF NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth THEN v_changed := v_changed || jsonb_build_object('date_of_birth', true); v_old := v_old || jsonb_build_object('date_of_birth', OLD.date_of_birth); v_new := v_new || jsonb_build_object('date_of_birth', NEW.date_of_birth); END IF;
  IF NEW.lifecycle_status IS DISTINCT FROM OLD.lifecycle_status THEN v_changed := v_changed || jsonb_build_object('lifecycle_status', true); v_old := v_old || jsonb_build_object('lifecycle_status', OLD.lifecycle_status); v_new := v_new || jsonb_build_object('lifecycle_status', NEW.lifecycle_status); END IF;
  IF v_changed <> '{}'::jsonb THEN
    INSERT INTO public.profile_audit_log (profile_id, changed_by_user_id, changed_fields, old_values, new_values)
    VALUES (NEW.id, auth.uid(), v_changed, v_old, v_new);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_log_profile_change AFTER UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.log_profile_change();

CREATE OR REPLACE FUNCTION public.handle_profile_lifecycle_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.lifecycle_status = 'completed' AND (OLD.lifecycle_status IS DISTINCT FROM 'completed') THEN
    UPDATE public.client_services SET status = 'completed', progress_percentage = 100, updated_at = now()
    WHERE client_id = NEW.id AND status <> 'completed';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER profile_lifecycle_change AFTER UPDATE OF lifecycle_status ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_profile_lifecycle_change();

-- DSR + DATA BREACH
CREATE TABLE public.data_subject_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  request_type public.dsr_type NOT NULL,
  status public.dsr_status NOT NULL DEFAULT 'pending',
  details TEXT, resolution_notes TEXT,
  due_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  resolved_at TIMESTAMPTZ, resolved_by UUID, export_file_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.data_subject_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own DSRs" ON public.data_subject_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_superadmin(auth.uid()));
CREATE POLICY "Users create own DSRs" ON public.data_subject_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Superadmins update DSRs" ON public.data_subject_requests FOR UPDATE TO authenticated USING (public.is_superadmin(auth.uid()));
CREATE TRIGGER trg_dsr_updated BEFORE UPDATE ON public.data_subject_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.data_breach_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL, description TEXT NOT NULL,
  severity public.breach_severity NOT NULL DEFAULT 'medium',
  status public.breach_status NOT NULL DEFAULT 'detected',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notify_deadline_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '72 hours'),
  cnpd_notified_at TIMESTAMPTZ, data_subjects_notified_at TIMESTAMPTZ,
  affected_user_count INTEGER, affected_data_categories TEXT[],
  containment_actions TEXT, remediation_actions TEXT,
  reported_by_admin_id UUID, closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.data_breach_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmins view breaches" ON public.data_breach_incidents FOR SELECT TO authenticated USING (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmins insert breaches" ON public.data_breach_incidents FOR INSERT TO authenticated WITH CHECK (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmins update breaches" ON public.data_breach_incidents FOR UPDATE TO authenticated USING (public.is_superadmin(auth.uid()));
CREATE TRIGGER trg_breach_updated BEFORE UPDATE ON public.data_breach_incidents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helpers: bookable_admins_for_client + export_user_data
CREATE OR REPLACE FUNCTION public.bookable_admins_for_client(_client_profile_id uuid)
RETURNS TABLE (admin_profile_id uuid, admin_user_id uuid, company_name text, meet_link text, is_default boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.user_id, COALESCE(p.company_name, 'Setlix'), p.meet_link, true
  FROM public.profiles p JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE ur.role = 'superadmin'
  UNION
  SELECT p.id, p.user_id, COALESCE(p.company_name, 'Admin'), p.meet_link, false
  FROM public.admin_client_allocations a
  JOIN public.profiles p ON p.user_id = a.admin_user_id
  JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE a.client_profile_id = _client_profile_id AND ur.role = 'admin'
$$;

CREATE OR REPLACE FUNCTION public.export_user_data(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_caller uuid := auth.uid(); v_profile_id uuid; v_result jsonb;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF v_caller <> _user_id AND NOT public.is_superadmin(v_caller) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = _user_id LIMIT 1;
  SELECT jsonb_build_object(
    'exported_at', now(), 'user_id', _user_id,
    'profile', (SELECT to_jsonb(p) FROM public.profiles p WHERE p.user_id = _user_id),
    'consents', (SELECT jsonb_agg(to_jsonb(c)) FROM public.consent_log c WHERE c.user_id = _user_id),
    'documents', (SELECT jsonb_agg(jsonb_build_object('id', d.id, 'file_name', d.file_name, 'category', d.category, 'file_size', d.file_size, 'mime_type', d.mime_type, 'sha256_hash', d.sha256_hash, 'created_at', d.created_at, 'retention_until', d.retention_until)) FROM public.documents d WHERE d.user_id = _user_id),
    'appointments', (SELECT jsonb_agg(to_jsonb(a)) FROM public.appointments a WHERE a.client_id = v_profile_id),
    'invoices', (SELECT jsonb_agg(to_jsonb(i)) FROM public.invoices i WHERE i.client_id = v_profile_id),
    'service_requests', (SELECT jsonb_agg(to_jsonb(sr)) FROM public.service_requests sr WHERE sr.client_id = v_profile_id),
    'client_services', (SELECT jsonb_agg(to_jsonb(cs)) FROM public.client_services cs WHERE cs.client_id = v_profile_id),
    'document_audit_log', (SELECT jsonb_agg(to_jsonb(l)) FROM public.document_audit_log l WHERE l.target_user_id = _user_id OR l.actor_user_id = _user_id)
  ) INTO v_result;
  RETURN v_result;
END;
$$;

-- STORAGE: documents bucket + policies
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users read own document files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own document files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own document files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins read all document files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents' AND public.is_setlix_admin(auth.uid()));
CREATE POLICY "Admins upload to any folder" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents' AND public.is_setlix_admin(auth.uid()));
CREATE POLICY "Admins delete any document file" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documents' AND public.is_setlix_admin(auth.uid()));
CREATE POLICY "Admins manage contract files in documents bucket" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'contracts' AND public.is_setlix_admin(auth.uid())) WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'contracts' AND public.is_setlix_admin(auth.uid()));
CREATE POLICY "Clients read their own contract files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'contracts' AND (storage.foldername(name))[2] = auth.uid()::text);
CREATE POLICY "Clients upload signed contract files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'contracts' AND (storage.foldername(name))[2] = auth.uid()::text);
CREATE POLICY "Clients update their own contract files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'contracts' AND (storage.foldername(name))[2] = auth.uid()::text);

-- REALTIME
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
ALTER TABLE public.client_services REPLICA IDENTITY FULL;
ALTER TABLE public.document_requests REPLICA IDENTITY FULL;
ALTER TABLE public.contracts REPLICA IDENTITY FULL;
ALTER TABLE public.unauthorised_download_attempts REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_services;
ALTER PUBLICATION supabase_realtime ADD TABLE public.document_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contracts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.unauthorised_download_attempts;

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated subscribe to own topics" ON realtime.messages FOR SELECT TO authenticated USING (
  public.is_admin_or_super(auth.uid())
  OR realtime.topic() LIKE ('user:' || auth.uid()::text || '%')
  OR realtime.topic() LIKE ('profile:' || public.current_profile_id()::text || '%')
  OR EXISTS (SELECT 1 FROM public.conversations c WHERE realtime.topic() = 'conversation:' || c.id::text AND c.client_id = public.current_profile_id())
  OR EXISTS (SELECT 1 FROM public.appointments a WHERE realtime.topic() = 'appointment:' || a.id::text AND a.client_id = public.current_profile_id())
);
