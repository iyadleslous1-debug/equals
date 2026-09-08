-- ============================================================================
-- MVP0 · Row Level Security — enabled on EVERY table from day one.
-- ============================================================================
-- Model: users can read/write their OWN rows, plus rows explicitly shared with
-- them (friend-request counterpart, conversation participant). Nothing else.
-- `service_role` bypasses RLS (edge functions / moderation tooling only).
--
-- Policy inventory (9/9 tables covered):
--   users            select/insert/update own
--   profiles         select/insert/update/delete own
--   profile_photos   select/insert/update/delete own (via profile ownership)
--   swipe_actions    select own sent · insert own · no update/delete
--   friend_requests  select participant · insert as sender · update participant
--   conversations    select/insert/update as participant
--   messages         select/insert/update as participant
--   reports          select/insert own (reporter) · no update/delete
--   blocks           select/insert/delete own (blocker) · no update
--
-- Later hardening (documented, not deferred-open): narrow friend_request UPDATE
-- to status transitions, and message UPDATE to read_at-only, via BEFORE UPDATE
-- triggers once moderation/UX requirements settle.
-- ============================================================================

-- ── enable ───────────────────────────────────────────────────────────────────
ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_photos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipe_actions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks           ENABLE ROW LEVEL SECURITY;

-- ── helper: conversation membership (SECURITY DEFINER avoids RLS recursion) ──
CREATE OR REPLACE FUNCTION public.is_conversation_participant(convo_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = convo_id
      AND (c.participant_a_id = auth.uid() OR c.participant_b_id = auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- ── users ────────────────────────────────────────────────────────────────────
CREATE POLICY users_select_own ON public.users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY users_insert_own ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY users_update_own ON public.users
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ── profiles ─────────────────────────────────────────────────────────────────
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY profiles_delete_own ON public.profiles
  FOR DELETE USING (auth.uid() = user_id);
-- NOTE: discovery reads of OTHER profiles are intentionally absent in MVP0.
-- MVP1 adds a `SECURITY DEFINER` function (block-aware,wilaya-filtered) so
-- discovery never becomes a blanket SELECT policy.

-- ── profile_photos ───────────────────────────────────────────────────────────
CREATE POLICY photos_select_own ON public.profile_photos
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_photos.profile_id AND p.user_id = auth.uid()));
CREATE POLICY photos_insert_own ON public.profile_photos
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_photos.profile_id AND p.user_id = auth.uid()));
CREATE POLICY photos_update_own ON public.profile_photos
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_photos.profile_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_photos.profile_id AND p.user_id = auth.uid()));
CREATE POLICY photos_delete_own ON public.profile_photos
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = profile_photos.profile_id AND p.user_id = auth.uid()));

-- ── swipe_actions ────────────────────────────────────────────────────────────
-- Sent swipes are visible to the swiper only (receivers must NOT see who
-- skipped/requested them — "Liked You" ships later as an aggregate).
CREATE POLICY swipes_select_sent ON public.swipe_actions
  FOR SELECT USING (auth.uid() = swiper_id);
CREATE POLICY swipes_insert_own ON public.swipe_actions
  FOR INSERT WITH CHECK (auth.uid() = swiper_id);
-- no UPDATE / DELETE: history is append-only in MVP0.

-- ── friend_requests ──────────────────────────────────────────────────────────
CREATE POLICY requests_select_participant ON public.friend_requests
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY requests_insert_sender ON public.friend_requests
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY requests_update_participant ON public.friend_requests
  FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- ── conversations ────────────────────────────────────────────────────────────
CREATE POLICY convos_select_participant ON public.conversations
  FOR SELECT USING (auth.uid() = participant_a_id OR auth.uid() = participant_b_id);
CREATE POLICY convos_insert_participant ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = participant_a_id OR auth.uid() = participant_b_id);
CREATE POLICY convos_update_participant ON public.conversations
  FOR UPDATE
  USING (auth.uid() = participant_a_id OR auth.uid() = participant_b_id)
  WITH CHECK (auth.uid() = participant_a_id OR auth.uid() = participant_b_id);

-- ── messages ─────────────────────────────────────────────────────────────────
CREATE POLICY messages_select_participant ON public.messages
  FOR SELECT USING (public.is_conversation_participant(conversation_id));
CREATE POLICY messages_insert_sender ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND public.is_conversation_participant(conversation_id));
CREATE POLICY messages_update_participant ON public.messages
  FOR UPDATE
  USING (public.is_conversation_participant(conversation_id))
  WITH CHECK (public.is_conversation_participant(conversation_id));

-- ── reports ──────────────────────────────────────────────────────────────────
CREATE POLICY reports_select_own ON public.reports
  FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY reports_insert_own ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);
-- no UPDATE / DELETE: reports are immutable evidence; moderation acts via
-- service_role tooling.

-- ── blocks ───────────────────────────────────────────────────────────────────
CREATE POLICY blocks_select_own ON public.blocks
  FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY blocks_insert_own ON public.blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY blocks_delete_own ON public.blocks
  FOR DELETE USING (auth.uid() = blocker_id);
-- no UPDATE: unblock = DELETE + re-INSERT keeps history semantics clean.
