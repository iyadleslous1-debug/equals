-- ============================================================================
-- MVP2 – compatibility scoring (deterministic, NOT AI/embeddings).
--
-- Survey RLS is own-row, so the client can never read another user's
-- answers. Scoring therefore happens here, server-side, and the RPC returns
-- ONLY (profile_id, score) — raw answers never leave the database.
--
-- Weights (total 100), applied to two COMPLETED surveys:
--   hobbies Jaccard overlap x20 · vibe x15 · sports/cooking/travel x10 each
--   kids x10 · smoking x5 · rhythm closeness x8 · family/career closeness x6
-- Scale closeness = (1 - |a-b|/4), i.e. adjacent values still score 75%.
--
-- On-the-fly, not materialized: the deck caps at ~20 rows and a 10-question
-- compare is trivial CPU. If decks grow, add a score cache then — not now.
-- Missing survey on either side yields NO ROW (client keeps default order,
-- no penalty, no error).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.survey_score(a JSONB, b JSONB)
RETURNS INTEGER
LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  -- Every term is NULL-proofed: the DB stores answers opaque (only the
  -- client zod schema is strict), so missing keys, non-array hobbies, or
  -- non-numeric scales contribute 0 instead of NULL-poisoning the sum or
  -- aborting the batch.
  SELECT ROUND(
    COALESCE(
      CASE
        WHEN jsonb_typeof(a -> 'hobbies') = 'array' AND jsonb_typeof(b -> 'hobbies') = 'array'
        THEN 20.0
          * (SELECT COUNT(*) FROM (
              SELECT jsonb_array_elements_text(a -> 'hobbies')
              INTERSECT
              SELECT jsonb_array_elements_text(b -> 'hobbies')) i)
          / NULLIF(
              (SELECT COUNT(*) FROM jsonb_array_elements_text(a -> 'hobbies'))
              + (SELECT COUNT(*) FROM jsonb_array_elements_text(b -> 'hobbies'))
              - (SELECT COUNT(*) FROM (
                  SELECT jsonb_array_elements_text(a -> 'hobbies')
                  INTERSECT
                  SELECT jsonb_array_elements_text(b -> 'hobbies')) i),
            0)
        ELSE 0
      END,
    0)
    + 15 * COALESCE((a ->> 'vibe' = b ->> 'vibe')::INT, 0)
    + 10 * COALESCE((a ->> 'sports' = b ->> 'sports')::INT, 0)
    + 10 * COALESCE((a ->> 'cooking' = b ->> 'cooking')::INT, 0)
    + 10 * COALESCE((a ->> 'travel' = b ->> 'travel')::INT, 0)
    + 10 * COALESCE((a ->> 'kids' = b ->> 'kids')::INT, 0)
    + 5 * COALESCE((a ->> 'smoking' = b ->> 'smoking')::INT, 0)
    + 8 * CASE
        WHEN (a ->> 'rhythm') ~ '^[1-5]$' AND (b ->> 'rhythm') ~ '^[1-5]$'
        THEN 1 - ABS((a ->> 'rhythm')::INT - (b ->> 'rhythm')::INT) / 4.0
        ELSE 0
      END
    + 6 * CASE
        WHEN (a ->> 'family') ~ '^[1-5]$' AND (b ->> 'family') ~ '^[1-5]$'
        THEN 1 - ABS((a ->> 'family')::INT - (b ->> 'family')::INT) / 4.0
        ELSE 0
      END
    + 6 * CASE
        WHEN (a ->> 'career') ~ '^[1-5]$' AND (b ->> 'career') ~ '^[1-5]$'
        THEN 1 - ABS((a ->> 'career')::INT - (b ->> 'career')::INT) / 4.0
        ELSE 0
      END
  )::INTEGER;
$$;

REVOKE ALL ON FUNCTION public.survey_score(JSONB, JSONB) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.get_compatibility(p_user_ids UUID[])
RETURNS TABLE (user_id UUID, score INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  mine JSONB;
BEGIN
  SELECT s.answers INTO mine
  FROM public.personality_surveys s
  JOIN public.profiles p ON p.id = s.profile_id
  WHERE p.user_id = auth.uid() AND s.completed_at IS NOT NULL;
  IF mine IS NULL THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT p.user_id, public.survey_score(mine, t.answers)
  FROM public.personality_surveys t
  JOIN public.profiles p ON p.id = t.profile_id
  WHERE p.user_id = ANY (p_user_ids)
    -- Never score yourself; callers pass deck ids only (deck cap is 20, the
    -- slice below is backstop against oracle-style enumeration batches).
    AND p.user_id <> auth.uid()
    AND t.completed_at IS NOT NULL
  LIMIT 25;
END;
$$;

REVOKE ALL ON FUNCTION public.get_compatibility(UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_compatibility(UUID[]) TO authenticated, service_role;
