-- ============================================================================
-- MVP1 · conversation previews: one-query inbox for the Chat list.
-- ============================================================================
-- Same RLS problem as requests: `profiles` is owner-only, so counterpart
-- names/avatars for conversations need a definer path. One rpc returns my
-- conversations (ordered) with counterpart fields, last message, and unread
-- count — no N+1, no client-side joins that RLS would empty anyway.
-- auth.uid() internally (no viewer param — oracle rule, see discovery).
-- Counterpart without a profile row surfaces NULLs (client renders
-- "Utilisateur indisponible"). Blocked/deleted counterparts are NOT hidden
-- here (history stays readable); WRITES are what the block-lock freezes.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_conversation_previews()
RETURNS TABLE (
  conversation_id UUID,
  other_user_id UUID,
  other_name VARCHAR(40),
  other_age SMALLINT,
  other_wilaya SMALLINT,
  other_card TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread BIGINT
)
AS $$
  SELECT
    c.id AS conversation_id,
    CASE WHEN c.participant_a_id = auth.uid()
      THEN c.participant_b_id
      ELSE c.participant_a_id
    END AS other_user_id,
    p.display_name AS other_name,
    p.age AS other_age,
    p.wilaya AS other_wilaya,
    (
      SELECT ph.url FROM public.profile_photos ph
      WHERE ph.profile_id = p.id
        AND ph.is_card_photo
        AND ph.moderation_status <> 'rejected'
      LIMIT 1
    ) AS other_card,
    (
      SELECT m.content_text FROM public.messages m
      WHERE m.conversation_id = c.id
      ORDER BY m.created_at DESC
      LIMIT 1
    ) AS last_message,
    (
      SELECT m.created_at FROM public.messages m
      WHERE m.conversation_id = c.id
      ORDER BY m.created_at DESC
      LIMIT 1
    ) AS last_message_at,
    (
      SELECT COUNT(*) FROM public.messages m
      WHERE m.conversation_id = c.id
        AND m.sender_id <> auth.uid()
        AND m.read_at IS NULL
    ) AS unread
  FROM public.conversations c
  LEFT JOIN public.profiles p ON p.user_id = (
    CASE WHEN c.participant_a_id = auth.uid()
      THEN c.participant_b_id
      ELSE c.participant_a_id
    END
  )
  WHERE c.participant_a_id = auth.uid() OR c.participant_b_id = auth.uid()
  ORDER BY c.last_message_at DESC;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

REVOKE ALL ON FUNCTION public.get_conversation_previews() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_conversation_previews() TO authenticated;
