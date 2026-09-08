-- ============================================================================
-- MVP1 · chat guards: block-lock + message rate enforcement.
-- ============================================================================
-- 1. `enforce_block_lock()` — if either conversation party blocks the other,
--    NO ONE can write to that conversation (both directions, immediately).
--    App-level hiding is bypassable; this trigger is the enforcement. Reads
--    stay participant-scoped (history remains visible; frozen — neither side
--    can append). SECURITY DEFINER is load-bearing here, not a shortcut: the
--    blocked party cannot SELECT the block row under RLS, so an invoker-rights
--    function would see nothing and never fire (caught by live probe before
--    any UI was built). service_role bypasses (auth.uid() NULL convention).
-- 2. `enforce_message_rate_limit()` — `message_send` 30/min per
--    `docs/abuse-policy.md`. Client sends fail fast; THESE decide.
-- Denials raise identifiable messages the app maps to visible states
-- (locked notice vs throttle), never silent failures.
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
    RAISE EXCEPTION 'locked: conversation blocked' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS messages_block_lock ON public.messages;
CREATE TRIGGER messages_block_lock
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_block_lock();

CREATE OR REPLACE FUNCTION public.enforce_message_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- service_role bypasses (see enforce_swipe_rate_limit).
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT public.check_rate_limit('message_send', 30, 60) THEN
    RAISE EXCEPTION 'rate_limited: too many messages' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS messages_rate_limit ON public.messages;
CREATE TRIGGER messages_rate_limit
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_message_rate_limit();

-- ── 3. realtime publication ─────────────────────────────────────────────────
-- postgres_changes delivers nothing until the table joins the publication.
-- Delivery still honors table RLS per subscriber (verified: participants
-- receive, outsiders stay silent — see scripts/verify-chat.mjs probes 2+3).
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
