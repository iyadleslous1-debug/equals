# Survey (MVP2 piece 1)

Personality survey → deterministic compatibility ordering (piece 2).

- Table: `personality_surveys` (PK `profile_id` → `profiles.id`, `answers`
  jsonb, `completed_at`). One row per profile; retakes overwrite.
- RLS: own-row only via `profiles.user_id = auth.uid()` (select/insert/
  update/delete). Negative cases live in `scripts/verify-survey.mjs`.
- Shape: `surveyAnswersSchema` (zod, `.strict()`) — the single source of
  truth for questions, used by the form, the hook, and piece-2 scoring.
- Flow: deferrable `SurveyPrompt` on Discover (session-dismissed via
  "Later") → `/survey` screen. Never gates discovery.
- Copy: English, plain and direct.
- Query keys: `['survey', 'mine']`. Saves invalidate it.
