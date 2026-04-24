-- Question type enum
CREATE TYPE public.survey_question_type AS ENUM (
  'short_text',
  'long_text',
  'single_choice',
  'multiple_choice',
  'yes_no'
);

-- 1. Survey templates (built by superadmin)
CREATE TABLE public.survey_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Questions within a template
CREATE TABLE public.survey_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.survey_templates(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type public.survey_question_type NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  required boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_survey_questions_template ON public.survey_questions(template_id, position);

-- 3. Assignments (template -> client profile)
CREATE TABLE public.survey_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.survey_templates(id) ON DELETE CASCADE,
  client_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by_user_id uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_id, client_profile_id)
);
CREATE INDEX idx_survey_assignments_client ON public.survey_assignments(client_profile_id);

-- 4. Current answer per question per assignment
CREATE TABLE public.survey_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.survey_assignments(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.survey_questions(id) ON DELETE CASCADE,
  answer jsonb,
  updated_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, question_id)
);
CREATE INDEX idx_survey_answers_assignment ON public.survey_answers(assignment_id);

-- 5. Append-only history of previous answers
CREATE TABLE public.survey_answer_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id uuid NOT NULL REFERENCES public.survey_answers(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL,
  question_id uuid NOT NULL,
  previous_answer jsonb,
  changed_by_user_id uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_survey_answer_history_answer ON public.survey_answer_history(answer_id);

-- updated_at triggers
CREATE TRIGGER trg_survey_templates_updated_at BEFORE UPDATE ON public.survey_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_survey_questions_updated_at BEFORE UPDATE ON public.survey_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_survey_answers_updated_at BEFORE UPDATE ON public.survey_answers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: log previous answer to history before update
CREATE OR REPLACE FUNCTION public.log_survey_answer_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.answer IS DISTINCT FROM OLD.answer THEN
    INSERT INTO public.survey_answer_history
      (answer_id, assignment_id, question_id, previous_answer, changed_by_user_id)
    VALUES
      (OLD.id, OLD.assignment_id, OLD.question_id, OLD.answer, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_survey_answer_change
  BEFORE UPDATE ON public.survey_answers
  FOR EACH ROW EXECUTE FUNCTION public.log_survey_answer_change();

-- Enable RLS
ALTER TABLE public.survey_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_answer_history ENABLE ROW LEVEL SECURITY;

-- ===== survey_templates policies =====
CREATE POLICY "Superadmins manage survey templates"
  ON public.survey_templates FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "View survey templates"
  ON public.survey_templates FOR SELECT TO authenticated
  USING (
    public.is_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.survey_assignments sa
      WHERE sa.template_id = survey_templates.id
        AND sa.client_profile_id = public.current_profile_id()
    )
  );

-- ===== survey_questions policies =====
CREATE POLICY "Superadmins manage survey questions"
  ON public.survey_questions FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "View survey questions"
  ON public.survey_questions FOR SELECT TO authenticated
  USING (
    public.is_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.survey_assignments sa
      WHERE sa.template_id = survey_questions.template_id
        AND sa.client_profile_id = public.current_profile_id()
    )
  );

-- ===== survey_assignments policies =====
CREATE POLICY "Superadmins manage survey assignments"
  ON public.survey_assignments FOR ALL TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "View survey assignments"
  ON public.survey_assignments FOR SELECT TO authenticated
  USING (
    public.is_superadmin(auth.uid())
    OR client_profile_id = public.current_profile_id()
  );

-- ===== survey_answers policies =====
CREATE POLICY "View survey answers"
  ON public.survey_answers FOR SELECT TO authenticated
  USING (
    public.is_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.survey_assignments sa
      WHERE sa.id = survey_answers.assignment_id
        AND sa.client_profile_id = public.current_profile_id()
    )
  );

CREATE POLICY "Clients insert their own survey answers"
  ON public.survey_answers FOR INSERT TO authenticated
  WITH CHECK (
    public.is_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.survey_assignments sa
      WHERE sa.id = survey_answers.assignment_id
        AND sa.client_profile_id = public.current_profile_id()
    )
  );

CREATE POLICY "Clients update their own survey answers"
  ON public.survey_answers FOR UPDATE TO authenticated
  USING (
    public.is_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.survey_assignments sa
      WHERE sa.id = survey_answers.assignment_id
        AND sa.client_profile_id = public.current_profile_id()
    )
  )
  WITH CHECK (
    public.is_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.survey_assignments sa
      WHERE sa.id = survey_answers.assignment_id
        AND sa.client_profile_id = public.current_profile_id()
    )
  );

CREATE POLICY "Superadmins delete survey answers"
  ON public.survey_answers FOR DELETE TO authenticated
  USING (public.is_superadmin(auth.uid()));

-- ===== survey_answer_history policies =====
CREATE POLICY "View survey answer history"
  ON public.survey_answer_history FOR SELECT TO authenticated
  USING (
    public.is_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.survey_assignments sa
      WHERE sa.id = survey_answer_history.assignment_id
        AND sa.client_profile_id = public.current_profile_id()
    )
  );
-- No INSERT/UPDATE/DELETE policies: writes happen via SECURITY DEFINER trigger only.
