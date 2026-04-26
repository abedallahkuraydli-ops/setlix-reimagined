
-- Failed login attempts log
CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  user_agent text,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_login_attempts_email_time ON public.login_attempts (lower(email), attempted_at DESC);
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmins read login attempts"
  ON public.login_attempts FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.uid()));

-- Account lockouts (one active row per email when locked_until/unlocked_at is null)
CREATE TABLE public.account_lockouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  user_id uuid,
  locked_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL DEFAULT 'too_many_failed_logins',
  failed_attempt_count integer NOT NULL DEFAULT 0,
  unlocked_at timestamptz,
  unlocked_by uuid,
  password_reset_required boolean NOT NULL DEFAULT true,
  notes text
);
CREATE INDEX idx_account_lockouts_email_active ON public.account_lockouts (lower(email)) WHERE unlocked_at IS NULL;
ALTER TABLE public.account_lockouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmins read lockouts"
  ON public.account_lockouts FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.uid()));
CREATE POLICY "Superadmins update lockouts"
  ON public.account_lockouts FOR UPDATE TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

-- Helper: is this email currently locked?
CREATE OR REPLACE FUNCTION public.is_email_locked(_email text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.account_lockouts
    WHERE lower(email) = lower(_email) AND unlocked_at IS NULL
  )
$$;
GRANT EXECUTE ON FUNCTION public.is_email_locked(text) TO anon, authenticated;

-- Helper for clients: count recent failed attempts for an email (last 30 min)
CREATE OR REPLACE FUNCTION public.count_recent_failed_logins(_email text)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.login_attempts
  WHERE lower(email) = lower(_email) AND attempted_at > now() - interval '30 minutes'
$$;
GRANT EXECUTE ON FUNCTION public.count_recent_failed_logins(text) TO anon, authenticated;
