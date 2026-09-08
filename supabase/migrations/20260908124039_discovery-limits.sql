-- ============================================================================
-- MVP1 follow-up · discovery hardening (review findings, Piece 3).
-- ============================================================================
-- 1. Deck limit clamp: p_limit was low-clamped only — NULL meant LIMIT NULL
--    (no limit, full enumeration) and huge values dumped the table. Coerce
--    NULL → 20, clamp to [1, 50] (client default 20).
-- 2. Least-privilege execute: REVOKE from PUBLIC/anon, keep authenticated.
--    (Anon got empty sets anyway via auth.uid() NULL filtering; this makes
--    the intent explicit instead of accidental.)
--
-- Documented product intents (do not "fix" without a product decision):
-- a. Reverse-swipe exclusion is INTENTIONAL: if either side swiped, the pair
--    leaves the deck. Hides own history and prevents liked-you leaks (swipe
--    reads are sender-only). Inbound interest surfaces in Requests, never in
--    the deck. The Requests piece must reconcile mirrored pendings (A→B plus
--    B→A are distinct rows by design — see friend_requests_pending_idx,
--    which only dedupes same-direction pendings).
-- b. `pending` photos are deck-eligible INTERIM: with no moderation tooling
--    yet, approved-only would leave every deck empty. Flip the gate + card
--    subquery to `= 'approved'` the day approval tooling ships (rejected
--    stays excluded regardless — enforced in app gate too).
-- ============================================================================

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
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

REVOKE ALL ON FUNCTION public.get_discovery_candidates(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_discovery_candidates(INTEGER) TO authenticated;
