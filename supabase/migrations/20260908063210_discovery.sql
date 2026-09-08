-- ============================================================================
-- MVP1 · discovery: gated deck function + server-side rate enforcement.
-- ============================================================================
-- 1. `get_discovery_candidates()` — the ONLY read path for strangers'
--    profiles (RLS otherwise hides everyone by design). SECURITY DEFINER so it
--    can read across owners; every exclusion below is explicit and tested:
--    self · swiped either direction · blocked/blocking either direction ·
--    non-active owners (via `active_profiles`: deleted AND suspended stay out)
--    · profiles with zero acceptable (non-rejected) photos. DB NOT NULLs
--    already guarantee complete fields; photos are the remaining gate.
-- 2. Rate-limit triggers (budgets per `docs/abuse-policy.md`, tune later):
--    `swipe_actions` 60/min, `friend_requests` 10/hr. Client best-effort calls
--    stay, but THESE decide. Denials raise `P0001 rate_limited:*`, which the
--    app maps to visible throttle states — never silent.
-- ============================================================================

-- ── 1. deck function ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_discovery_candidates(p_limit INTEGER DEFAULT 20)
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
  ORDER BY random()
  LIMIT GREATEST(p_limit, 1);
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_discovery_candidates(INTEGER) TO authenticated;

-- ── 2. rate-limit triggers ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_swipe_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- service_role (seed, moderation tooling) has no auth.uid() and bypasses
  -- RLS by design; rate limits are anti-abuse for clients, not the server.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT public.check_rate_limit('swipe', 60, 60) THEN
    RAISE EXCEPTION 'rate_limited: too many swipes' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS swipe_actions_rate_limit ON public.swipe_actions;
CREATE TRIGGER swipe_actions_rate_limit
  BEFORE INSERT ON public.swipe_actions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_swipe_rate_limit();

CREATE OR REPLACE FUNCTION public.enforce_request_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- service_role bypasses (see enforce_swipe_rate_limit).
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT public.check_rate_limit('request_send', 10, 3600) THEN
    RAISE EXCEPTION 'rate_limited: too many requests' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS friend_requests_rate_limit ON public.friend_requests;
CREATE TRIGGER friend_requests_rate_limit
  BEFORE INSERT ON public.friend_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_request_rate_limit();
