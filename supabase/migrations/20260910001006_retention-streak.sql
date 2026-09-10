-- ============================================================================
-- MVP3 – retention backend: login streaks + activity heartbeat.
--
-- user_stats: one row per user (created lazily by record_login). Streaks are
-- date-based (UTC): same day = no-op, yesterday = +1, older = reset to 1.
-- longest_streak is a high-water mark. Clients can READ their own row only;
-- all writes go through record_login() (no insert/update/delete policies).
-- users.last_active_at powers "active recently" (piece: heartbeat). Direct
-- writes denied; touch_activity() stamps it at most once per 5 minutes.
-- ============================================================================

CREATE TABLE public.user_stats (
  user_id        UUID PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  last_login_date DATE NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER user_stats_updated_at
  BEFORE UPDATE ON public.user_stats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.users
  ADD COLUMN last_active_at TIMESTAMPTZ NULL;

ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_stats_select_own"
  ON public.user_stats FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.record_login()
RETURNS TABLE (current_streak INTEGER, longest_streak INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  today DATE := (now() AT TIME ZONE 'UTC')::DATE;
  row public.user_stats%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not signed in' USING ERRCODE = 'P0002';
  END IF;
  -- Upsert-first: concurrent double-claims converge (second waits on the
  -- row lock, then hits the same-day no-op) instead of 23505.
  INSERT INTO public.user_stats (user_id, current_streak, longest_streak, last_login_date)
  VALUES (auth.uid(), 1, 1, today)
  ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO row FROM public.user_stats WHERE user_id = auth.uid() FOR UPDATE;
  -- Streak boundary is UTC-midnight (server now(), no client clock involved).
  -- Today or future (admin correction) = no-op, never a wipe.
  IF row.last_login_date >= today THEN
    RETURN QUERY SELECT row.current_streak, row.longest_streak;
    RETURN;
  ELSIF row.last_login_date = today - 1 THEN
    row.current_streak := row.current_streak + 1;
  ELSE
    row.current_streak := 1;
  END IF;
  row.longest_streak := GREATEST(row.longest_streak, row.current_streak);
  row.last_login_date := today;
  UPDATE public.user_stats
  SET current_streak = row.current_streak,
      longest_streak = row.longest_streak,
      last_login_date = row.last_login_date
  WHERE user_id = auth.uid();
  RETURN QUERY SELECT row.current_streak, row.longest_streak;
END;
$$;

REVOKE ALL ON FUNCTION public.record_login() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_login() TO authenticated, service_role;

-- users_update_own is broad: without this, any client could forge
-- last_active_at (presence forgery) or dodge the 5-minute throttle.
-- The stamp passes via a transaction-local flag that only touch_activity
-- sets — direct client UPDATEs never carry it. Service role (admin
-- tooling) bypasses the force-back.
CREATE OR REPLACE FUNCTION public.forbid_active_at_forgery()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF current_setting('app.active_at_writer', TRUE) IS DISTINCT FROM 'touch_activity'
    AND (auth.jwt() ->> 'role') IS DISTINCT FROM 'service_role'
    AND NEW.last_active_at IS DISTINCT FROM OLD.last_active_at THEN
    NEW.last_active_at := OLD.last_active_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_active_at_no_forge ON public.users;
CREATE TRIGGER users_active_at_no_forge
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.forbid_active_at_forgery();

CREATE OR REPLACE FUNCTION public.touch_activity()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  PERFORM set_config('app.active_at_writer', 'touch_activity', TRUE);
  UPDATE public.users
  SET last_active_at = now()
  WHERE id = auth.uid()
    AND (last_active_at IS NULL OR last_active_at < now() - INTERVAL '5 minutes');
END;
$$;

REVOKE ALL ON FUNCTION public.touch_activity() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.touch_activity() TO authenticated, service_role;
