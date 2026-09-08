-- ============================================================================
-- MVP1 follow-up · chat ordering + machine-readable lock code (review, P5).
-- ============================================================================
-- 1. Deterministic order: last_message_at ties (creation `now()` collisions)
--    shuffled the list between refetches. Tiebreaker `c.id` (precedent:
--    inbox-hardening migration).
-- 2. Single source for last message: content + timestamp came from two
--    independent correlated subqueries that could split on created_at ties.
--    One LATERAL fetch returns both, same row, same tiebreaker.
-- 3. Distinct lock code: block-lock and rate-limit both raised P0001, so the
--    app could only tell them apart by message regex. Lock is now `P0002`
--    (custom, documented here); rate stays P0001. App maps on code with the
--    `locked:`/`rate_limited:` prefix as fallback, never bare substrings.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_block_lock()
RETURNS TRIGGER AS $$
DECLARE
  v_other UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT
    CASE WHEN c.participant_a_id = NEW.sender_id
      THEN c.participant_b_id
      ELSE c.participant_a_id
    END INTO v_other
  FROM public.conversations c
  WHERE c.id = NEW.conversation_id;

  IF EXISTS (
    SELECT 1 FROM public.blocks b
    WHERE (b.blocker_id = NEW.sender_id AND b.blocked_id = v_other)
       OR (b.blocker_id = v_other AND b.blocked_id = NEW.sender_id)
  ) THEN
    RAISE EXCEPTION 'locked: conversation blocked' USING ERRCODE = 'P0002';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
    lm.content_text AS last_message,
    lm.created_at AS last_message_at,
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
  LEFT JOIN LATERAL (
    SELECT m.content_text, m.created_at FROM public.messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT 1
  ) lm ON true
  WHERE c.participant_a_id = auth.uid() OR c.participant_b_id = auth.uid()
  ORDER BY c.last_message_at DESC, c.id DESC;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

REVOKE ALL ON FUNCTION public.get_conversation_previews() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_conversation_previews() TO authenticated;
