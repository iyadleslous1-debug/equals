-- ============================================================================
-- MVP1 follow-up · inbox hardening (review findings, Piece 4).
-- ============================================================================
-- 1. LEFT JOIN profiles: senders without a profile row (deleted profile,
--    pre-onboarding) previously vanished silently with no way to act. Now
--    they surface with NULL counterpart fields and the client renders
--    "Utilisateur indisponible" (NULL-tolerance the original comment
--    promised but the INNER JOIN never delivered).
-- 2. Deleted/suspended owners are excluded entirely (a dead account's request
--    is unactionable). Blocked either direction is excluded too, mirroring
--    the deck — the inbox never shows people you can't interact with.
-- 3. Stable ORDER BY (created_at DESC, id) — identical timestamps no longer
--    shuffle rows between refetches.
--
-- Standing product intents (see features/requests README):
-- received = pending only (accepted/declined incoming belong to Chat from
-- Piece 5 on); sent keeps full history with status chips.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_request_inbox()
RETURNS TABLE (
  id UUID,
  sender_id UUID,
  receiver_id UUID,
  status TEXT,
  created_at TIMESTAMPTZ,
  direction TEXT,
  counterpart_user_id UUID,
  counterpart_name VARCHAR(40),
  counterpart_age SMALLINT,
  counterpart_wilaya SMALLINT,
  counterpart_card TEXT
)
AS $$
  SELECT
    r.id, r.sender_id, r.receiver_id, r.status, r.created_at,
    'received'::TEXT AS direction,
    r.sender_id AS counterpart_user_id,
    p.display_name AS counterpart_name,
    p.age AS counterpart_age,
    p.wilaya AS counterpart_wilaya,
    (
      SELECT ph.url FROM public.profile_photos ph
      WHERE ph.profile_id = p.id
        AND ph.is_card_photo
        AND ph.moderation_status <> 'rejected'
      LIMIT 1
    ) AS counterpart_card
  FROM public.friend_requests r
  LEFT JOIN public.profiles p ON p.user_id = r.sender_id
  JOIN public.users u ON u.id = r.sender_id
  WHERE r.receiver_id = auth.uid()
    AND r.status = 'pending'
    AND u.account_status = 'active' AND u.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = r.sender_id)
         OR (b.blocker_id = r.sender_id AND b.blocked_id = auth.uid())
    )
  UNION ALL
  SELECT
    r.id, r.sender_id, r.receiver_id, r.status, r.created_at,
    'sent'::TEXT AS direction,
    r.receiver_id AS counterpart_user_id,
    p.display_name AS counterpart_name,
    p.age AS counterpart_age,
    p.wilaya AS counterpart_wilaya,
    (
      SELECT ph.url FROM public.profile_photos ph
      WHERE ph.profile_id = p.id
        AND ph.is_card_photo
        AND ph.moderation_status <> 'rejected'
      LIMIT 1
    ) AS counterpart_card
  FROM public.friend_requests r
  LEFT JOIN public.profiles p ON p.user_id = r.receiver_id
  WHERE r.sender_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = r.receiver_id)
         OR (b.blocker_id = r.receiver_id AND b.blocked_id = auth.uid())
    )
  ORDER BY created_at DESC, id;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

REVOKE ALL ON FUNCTION public.get_request_inbox() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_request_inbox() TO authenticated;
