-- ============================================================================
-- Audit S2 · write-surface hardening (no new features, guards only).
-- ============================================================================
-- 1. Message content immutability: `messages_update_participant` lets any
--    participant UPDATE any column, so today anyone can rewrite anyone's
--    words. From here only `read_at` may change client-side (history +
--    receipts keep working; content/sender/conversation are append-only
--    facts like request participants).
-- 2. Conversation participant immutability: same class — participants could
--    rewrite the pair and hijack the thread. `last_message_at` stays
--    server-managed (touch_conversation trigger owns it).
-- 3. `search_path` pins on the last two unpinned functions
--    (`guard_request_transition`, `set_updated_at`). Both are invoker-rights
--    (lower risk), but uniform pinning leaves no audit exception behind.
-- 4. Least-privilege EXECUTE: trigger helpers + guards callable by anon
--    served no purpose (triggers don't check grants; direct calls are
--    meaningless or, for check_rate_limit, bucket noise). Keep
--    authenticated + service_role only.
-- 5. Rate-limit coverage for the remaining bucketed actions. `message_send`,
--    `swipe` and `request_send` were enforced in their piece migrations.
--    `report_submit` and `profile_update` had buckets but no triggers
--    (client-best-effort only) — now enforced, same pattern, same bypass,
--    budgets per docs/abuse-policy.md posture (tune from data, never gut).
--    `photo_upload` deliberately has NO storage trigger: the Storage API
--    writes as a privileged role with no caller JWT claims, so auth.uid() is
--    NULL there and any trigger would bypass unconditionally (proven by live
--    probe during this audit — uploads counted zero). Photo-abuse is bounded
--    instead by the profile_photos row path (RLS + MAX_PHOTOS cap + the
--    `profile_update` budget below is untouched by uploads). Storage RLS
--    policies stay as defense-in-depth for direct-SQL access.
-- ============================================================================

-- ── 1. message content immutability ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.forbid_message_rewrite()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.sender_id IS DISTINCT FROM OLD.sender_id
    OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
    OR NEW.content_text IS DISTINCT FROM OLD.content_text
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'messages are immutable except read_at'
      USING ERRCODE = '25001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS messages_immutable_content ON public.messages;
CREATE TRIGGER messages_immutable_content
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.forbid_message_rewrite();

-- ── 2. conversation participant immutability ────────────────────────────────
CREATE OR REPLACE FUNCTION public.forbid_conversation_rewrite()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.participant_a_id IS DISTINCT FROM OLD.participant_a_id
    OR NEW.participant_b_id IS DISTINCT FROM OLD.participant_b_id
  THEN
    RAISE EXCEPTION 'conversation participants are immutable'
      USING ERRCODE = '25001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS conversations_immutable_participants ON public.conversations;
CREATE TRIGGER conversations_immutable_participants
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.forbid_conversation_rewrite();

-- ── 3. search_path pins (body-identical replaces) ───────────────────────────
CREATE OR REPLACE FUNCTION public.guard_request_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Terminal states are immutable; only `pending` may move, and only forward.
  IF OLD.status <> 'pending' THEN
    RAISE EXCEPTION 'friend request % is already %', OLD.id, OLD.status
      USING ERRCODE = '25001';
  END IF;
  IF NEW.status = 'pending' THEN
    RAISE EXCEPTION 'friend request cannot return to pending'
      USING ERRCODE = '25001';
  END IF;
  -- Sender/receiver are append-only facts of the request.
  IF NEW.sender_id <> OLD.sender_id OR NEW.receiver_id <> OLD.receiver_id THEN
    RAISE EXCEPTION 'friend request participants are immutable'
      USING ERRCODE = '25001';
  END IF;
  NEW.responded_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ── 4. least-privilege EXECUTE on internals ─────────────────────────────────
REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.guard_request_transition() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guard_request_transition() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.forbid_moderation_self_write() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.forbid_moderation_self_write() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.forbid_message_rewrite() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.forbid_message_rewrite() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.forbid_conversation_rewrite() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.forbid_conversation_rewrite() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.enforce_swipe_rate_limit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enforce_swipe_rate_limit() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.enforce_request_rate_limit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enforce_request_rate_limit() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.enforce_message_rate_limit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enforce_message_rate_limit() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.enforce_block_lock() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enforce_block_lock() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_active() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active() TO authenticated, service_role;
-- NOTE: is_conversation_participant() is deliberately NOT revoked: RLS
-- policies evaluate it for every select INCLUDING anon, and policy-expression
-- calls check EXECUTE. Revoking would turn anon empty-sets into errors.
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.touch_conversation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.touch_conversation() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.set_card_photo(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_card_photo(UUID) TO authenticated, service_role;

-- ── 5. remaining rate triggers ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_misc_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_action TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  v_action := CASE TG_TABLE_NAME
    WHEN 'reports' THEN 'report_submit'
    ELSE 'profile_update'
  END;
  IF NOT public.check_rate_limit(v_action, 20, 3600) THEN
    RAISE EXCEPTION 'rate_limited: too many % actions', v_action USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS reports_rate_limit ON public.reports;
CREATE TRIGGER reports_rate_limit
  BEFORE INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.enforce_misc_rate_limit();

DROP TRIGGER IF EXISTS profiles_rate_limit ON public.profiles;
CREATE TRIGGER profiles_rate_limit
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_misc_rate_limit();
