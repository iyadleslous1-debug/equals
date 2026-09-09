-- ============================================================================
-- MVP2 – persisted discovery filters.
--
-- 1. Filter preference columns on profiles (NULL = no filter). Own-row RLS
--    already covers them — no policy change. Element ranges are validated
--    client-side (zod); the DB enforces structure (age bounds, min<=max,
--    known sort values) so a bad write fails loudly instead of silently
--    narrowing to nothing.
-- 2. get_discovery_candidates() gains optional filter params (all DEFAULTed,
--    existing callers unaffected). Filters NARROW the pool: every deck
--    exclusion (self/swipes/blocks/inactive/photos) still applies underneath.
--    p_sort 'newest' orders by profile recency; anything else (including
--    'compat', which the client applies itself) keeps random order.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN filter_age_min SMALLINT NULL
    CHECK (filter_age_min IS NULL OR (filter_age_min >= 18 AND filter_age_min <= 100)),
  ADD COLUMN filter_age_max SMALLINT NULL
    CHECK (filter_age_max IS NULL OR (filter_age_max >= 18 AND filter_age_max <= 100)),
  ADD COLUMN filter_wilayas SMALLINT[] NULL,
  ADD COLUMN filter_sort TEXT NULL
    CHECK (filter_sort IS NULL OR filter_sort IN ('default', 'newest', 'compat'));

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_filters_age_order
    CHECK (filter_age_min IS NULL OR filter_age_max IS NULL OR filter_age_min <= filter_age_max);

-- Element guard for direct writes bypassing zod: at most the 58 wilayas,
-- each 1–58. (Immutable so CHECK can use it.)
CREATE OR REPLACE FUNCTION public.valid_wilaya_set(w SMALLINT[])
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  SELECT w IS NULL
    OR (array_length(w, 1) IS NULL OR array_length(w, 1) <= 58)
    AND NOT EXISTS (SELECT 1 FROM unnest(w) v WHERE v IS NULL OR v < 1 OR v > 58);
$$;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_filters_wilayas_valid
    CHECK (public.valid_wilaya_set(filter_wilayas));

-- New signature = overload, not replace: drop the old single-arg form so
-- exactly one deck function exists (stale overload would bypass filters).
DROP FUNCTION IF EXISTS public.get_discovery_candidates(INTEGER);

CREATE OR REPLACE FUNCTION public.get_discovery_candidates(
  p_limit INTEGER DEFAULT 20,
  p_age_min SMALLINT DEFAULT NULL,
  p_age_max SMALLINT DEFAULT NULL,
  p_wilayas SMALLINT[] DEFAULT NULL,
  p_sort TEXT DEFAULT 'default'
)
RETURNS TABLE (
  user_id UUID,
  display_name VARCHAR(40),
  age SMALLINT,
  gender TEXT,
  wilaya SMALLINT,
  bio VARCHAR(500),
  card_photo_url TEXT
)
AS $$
  SELECT
    ap.user_id,
    ap.display_name,
    ap.age,
    ap.gender,
    ap.wilaya,
    ap.bio,
    (
      SELECT ph.url
      FROM public.profile_photos ph
      WHERE ph.profile_id = ap.id
        AND ph.is_card_photo
        AND ph.moderation_status <> 'rejected'
      LIMIT 1
    ) AS card_photo_url
  FROM public.active_profiles ap
  WHERE ap.user_id <> auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.swipe_actions s
      WHERE (s.swiper_id = auth.uid() AND s.swiped_id = ap.user_id)
         OR (s.swiper_id = ap.user_id AND s.swiped_id = auth.uid())
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = ap.user_id)
         OR (b.blocker_id = ap.user_id AND b.blocked_id = auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.profile_photos ph
      WHERE ph.profile_id = ap.id
        AND ph.moderation_status <> 'rejected'
    )
    AND (p_age_min IS NULL OR ap.age >= p_age_min)
    AND (p_age_max IS NULL OR ap.age <= p_age_max)
    AND (p_wilayas IS NULL OR array_length(p_wilayas, 1) IS NULL OR ap.wilaya = ANY (p_wilayas))
  ORDER BY
    CASE WHEN p_sort = 'newest' THEN ap.created_at END DESC NULLS LAST,
    random()
  -- Belt and suspenders with the client clamp: no caller turns the deck
  -- into a full-table scan.
  LIMIT LEAST(GREATEST(p_limit, 1), 50);
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_discovery_candidates(INTEGER, SMALLINT, SMALLINT, SMALLINT[], TEXT) TO authenticated;
