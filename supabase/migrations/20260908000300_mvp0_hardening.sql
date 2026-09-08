-- ============================================================================
-- MVP0 Round 2 · hardening: abuse scaffolding, write-race guards, soft-delete.
-- ============================================================================
-- 1. RATE LIMITS (Redis-free, in-Postgres). `check_rate_limit(action, max_n,
--    window_s)` is atomic (single upsert) and keys off `auth.uid()` — callers
--    cannot spoof each other's buckets. MVP0 exposes it for the client to call
--    best-effort via RPC; MVP1 adds BEFORE INSERT triggers on `messages` and
--    `swipe_actions` that enforce it server-side. Actions are allowlisted
--    inside the function so new call sites can't invent buckets.
-- 2. FRIEND-REQUEST TRANSITIONS. Two near-simultaneous accepts (double-tap,
--    retry storm, two devices) previously last-writer-won silently. The trigger
--    below makes status a one-way state machine out of `pending` and stamps
--    `responded_at` — the second writer gets a clear error instead of a
--    silent overwrite. Terminal states are immutable (appeals = new request
--    or moderation tooling via service_role).
-- 3. SOFT DELETE (decision: users are NEVER hard-deleted by the app).
--    `users.account_status='deleted'` + `deleted_at` retires the account while
--    messages/requests/reports stay intact for moderation and legal holds.
--    Physical erasure (GDPR-style) is an explicit admin operation documented
--    in ROLLBACK.md, NOT a client path. `is_active()` lets future policies
--    and the discovery function exclude retired accounts in one place.
-- ============================================================================

DO $$ BEGIN RAISE NOTICE 'migration 0003 hardening: start %', clock_timestamp(); END $$;

-- ── 1. rate limits ───────────────────────────────────────────────────────────
CREATE TABLE public.rate_limits (
  bucket_key   TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  count        INTEGER NOT NULL DEFAULT 1 CHECK (count >= 0)
);

-- No client policies on purpose: deny-by-default. Only SECURITY DEFINER
-- functions touch this table. (RLS enabled, zero policies = invisible.)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_action TEXT,
  p_max_count INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_key TEXT := auth.uid()::TEXT || ':' || p_action;
  v_row public.rate_limits%ROWTYPE;
BEGIN
  -- Allowlist: unknown actions fail closed, never open a bucket.
  IF p_action NOT IN ('message_send', 'swipe', 'request_send', 'report_submit', 'otp_send') THEN
    RAISE EXCEPTION 'rate limit: unknown action %', p_action;
  END IF;
  IF p_max_count < 1 OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'rate limit: invalid budget';
  END IF;

  INSERT INTO public.rate_limits (bucket_key, window_start, count)
  VALUES (v_key, now(), 1)
  ON CONFLICT (bucket_key) DO UPDATE
    SET window_start = CASE
          WHEN public.rate_limits.window_start < now() - (p_window_seconds || ' seconds')::INTERVAL
          THEN now() ELSE public.rate_limits.window_start END,
        count = CASE
          WHEN public.rate_limits.window_start < now() - (p_window_seconds || ' seconds')::INTERVAL
          THEN 1 ELSE public.rate_limits.count + 1 END
  RETURNING * INTO v_row;

  RETURN v_row.count <= p_max_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO authenticated;

-- ── 2. friend-request state machine ──────────────────────────────────────────
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS friend_requests_transition ON public.friend_requests;
CREATE TRIGGER friend_requests_transition
  BEFORE UPDATE ON public.friend_requests
  FOR EACH ROW EXECUTE FUNCTION public.guard_request_transition();

-- ── 3. soft delete ───────────────────────────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.users.deleted_at IS
  'Retirement timestamp. App-level deletion sets account_status=deleted + this stamp; rows are NEVER hard-deleted by clients.';

-- Single predicate for "may this identity act": used by the future discovery
-- function, JWT-hook gating, and any policy that needs it.
CREATE OR REPLACE FUNCTION public.is_active()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.account_status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

DO $$ BEGIN RAISE NOTICE 'migration 0003 hardening: done %', clock_timestamp(); END $$;
