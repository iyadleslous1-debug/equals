-- ============================================================================
-- MVP1 · request inbox: counterpart display data for the Requests piece.
-- ============================================================================
-- Problem: `profiles` RLS is owner-only, so a receiver cannot read the
-- sender's name/age/photo for request rows they legitimately participate in.
-- `get_request_inbox()` (SECURITY DEFINER, auth.uid() internally — never a
-- viewer param, same oracle rule as the deck function) returns both
-- directions with counterpart fields:
--   - received: pending rows where receiver = caller, counterpart = sender.
--   - sent: all rows where sender = caller, counterpart = receiver.
-- Mirrored pendings (A→B + B→A) both appear; the app reconciles on accept
-- (mutual-accept flips both — see features/requests README).
-- Cards prefer the counterpart's card photo; rejected-only counterparts yield
-- NULL (UI falls back to initials, never a broken image).
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
  JOIN public.profiles p ON p.user_id = r.sender_id
  WHERE r.receiver_id = auth.uid()
    AND r.status = 'pending'
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
  JOIN public.profiles p ON p.user_id = r.receiver_id
  WHERE r.sender_id = auth.uid()
  ORDER BY created_at DESC;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

REVOKE ALL ON FUNCTION public.get_request_inbox() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_request_inbox() TO authenticated;
