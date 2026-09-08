-- ============================================================================
-- MVP0 · core schema (9 tables)
-- ============================================================================
-- Design notes:
--  * `users.id` IS the Supabase Auth user id (`auth.users.id`). The
--    `handle_new_auth_user()` trigger below creates the row on signup, so the
--    client never inserts into `users` directly.
--  * Location is wilaya code only (1–58). Precise coordinates must NEVER be
--    added to these tables — see `profiles.wilaya` CHECK.
--  * Future tables attach without touching existing ones, e.g.:
--      points_ledger  (user_id → users.id, amount, reason, created_at)
--      subscriptions  (user_id → users.id UNIQUE, plan, renews_at)
--      ai_vectors     (profile_id → profiles.id UNIQUE, embedding vector)
--  * RLS lives in the NEXT migration (0002). Every table gets
--    `ENABLE ROW LEVEL SECURITY` there — nothing ships open.
-- ============================================================================

-- gen_random_uuid() lives here (pre-enabled on Supabase Cloud; explicit for
-- `supabase start` freshness).
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- ── users ────────────────────────────────────────────────────────────────────
CREATE TABLE public.users (
  id             UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  phone_number   TEXT NOT NULL UNIQUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  account_status TEXT NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active', 'suspended', 'deleted'))
);

-- ── profiles ─────────────────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL UNIQUE REFERENCES public.users (id) ON DELETE CASCADE,
  display_name VARCHAR(40) NOT NULL CHECK (char_length(display_name) >= 2),
  age          SMALLINT NOT NULL CHECK (age >= 18 AND age <= 100),
  gender       TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  wilaya       SMALLINT NOT NULL CHECK (wilaya >= 1 AND wilaya <= 58),
  bio          VARCHAR(500),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX profiles_wilaya_idx ON public.profiles (wilaya);
CREATE INDEX profiles_created_at_idx ON public.profiles (created_at DESC);

-- ── profile_photos ───────────────────────────────────────────────────────────
CREATE TABLE public.profile_photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  url           TEXT NOT NULL CHECK (char_length(url) > 0),
  order_index   SMALLINT NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  is_card_photo BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX profile_photos_profile_idx ON public.profile_photos (profile_id, order_index);
-- exactly one card photo per profile (partial unique index)
CREATE UNIQUE INDEX profile_photos_one_card_idx ON public.profile_photos (profile_id)
  WHERE is_card_photo;

-- ── swipe_actions ────────────────────────────────────────────────────────────
CREATE TABLE public.swipe_actions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  swiper_id  UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  swiped_id  UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  action     TEXT NOT NULL CHECK (action IN ('skip', 'request')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (swiper_id <> swiped_id),
  UNIQUE (swiper_id, swiped_id)
);
CREATE INDEX swipe_actions_swiper_idx ON public.swipe_actions (swiper_id, created_at DESC);
CREATE INDEX swipe_actions_swiped_idx ON public.swipe_actions (swiped_id);

-- ── friend_requests ──────────────────────────────────────────────────────────
CREATE TABLE public.friend_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id    UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  receiver_id  UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'canceled')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  CHECK (sender_id <> receiver_id)
);
-- one live request per direction pair
CREATE UNIQUE INDEX friend_requests_pending_idx ON public.friend_requests (sender_id, receiver_id)
  WHERE status = 'pending';
CREATE INDEX friend_requests_sender_idx ON public.friend_requests (sender_id, created_at DESC);
CREATE INDEX friend_requests_receiver_idx ON public.friend_requests (receiver_id, created_at DESC);

-- ── conversations ────────────────────────────────────────────────────────────
-- Pair is canonicalised (a < b) so (A,B) and (B,A) can never duplicate.
CREATE TABLE public.conversations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  participant_b_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (participant_a_id < participant_b_id),
  UNIQUE (participant_a_id, participant_b_id)
);
CREATE INDEX conversations_a_idx ON public.conversations (participant_a_id, last_message_at DESC);
CREATE INDEX conversations_b_idx ON public.conversations (participant_b_id, last_message_at DESC);

-- ── messages ─────────────────────────────────────────────────────────────────
CREATE TABLE public.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  content_text    VARCHAR(1000) NOT NULL CHECK (char_length(content_text) >= 1),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at         TIMESTAMPTZ
);
CREATE INDEX messages_convo_idx ON public.messages (conversation_id, created_at DESC);

-- ── reports ──────────────────────────────────────────────────────────────────
CREATE TABLE public.reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  reason      VARCHAR(60) NOT NULL CHECK (char_length(reason) >= 3),
  description VARCHAR(1000),
  status      TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reviewing', 'actioned', 'dismissed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (reporter_id <> reported_id)
);
CREATE INDEX reports_reporter_idx ON public.reports (reporter_id);
CREATE INDEX reports_reported_idx ON public.reports (reported_id);
CREATE INDEX reports_status_idx ON public.reports (status, created_at DESC);

-- ── blocks ───────────────────────────────────────────────────────────────────
CREATE TABLE public.blocks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (blocker_id <> blocked_id),
  UNIQUE (blocker_id, blocked_id)
);
CREATE INDEX blocks_blocker_idx ON public.blocks (blocker_id);
CREATE INDEX blocks_blocked_idx ON public.blocks (blocked_id);

-- ── housekeeping triggers ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Create the public.users row the moment Supabase Auth creates a user.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, phone_number)
  VALUES (NEW.id, COALESCE(NEW.phone, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Keep conversations.last_message_at fresh without client writes.
CREATE OR REPLACE FUNCTION public.touch_conversation()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER messages_touch_conversation
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_conversation();
