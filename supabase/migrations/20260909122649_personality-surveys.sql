-- ============================================================================
-- MVP2 – personality survey: one row per profile, owner-only.
-- `answers` is a validated JSON map (question id -> answer value); the shape
-- is enforced client-side by `surveySchema` (zod) — the DB stores it opaque
-- so questions can evolve without migrations. `completed_at` marks a
-- finished survey; a row without it is an abandoned/in-progress attempt.
-- One row per profile (PK on profile_id): retakes overwrite, never append.
-- ============================================================================

CREATE TABLE public.personality_surveys (
  profile_id   UUID PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  answers      JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(answers) = 'object'),
  completed_at TIMESTAMPTZ NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER personality_surveys_updated_at
  BEFORE UPDATE ON public.personality_surveys
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --- RLS: own-row only, via profiles.user_id (deny-by-default otherwise) ---
ALTER TABLE public.personality_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "personality_surveys_select_own"
  ON public.personality_surveys FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = personality_surveys.profile_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "personality_surveys_insert_own"
  ON public.personality_surveys FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = personality_surveys.profile_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "personality_surveys_update_own"
  ON public.personality_surveys FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = personality_surveys.profile_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = personality_surveys.profile_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "personality_surveys_delete_own"
  ON public.personality_surveys FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = personality_surveys.profile_id AND p.user_id = auth.uid()
    )
  );
