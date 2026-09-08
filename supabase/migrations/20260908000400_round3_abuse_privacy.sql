-- ============================================================================
-- MVP0 Round 3 · abuse coverage + privacy-by-default read surface.
-- ============================================================================
-- 1. RATE-LIMIT COVERAGE. The 0003 allowlist covered today's actions. MVP1
--    adds profile edits and photo uploads, so `profile_update` and
--    `photo_upload` join the allowlist NOW — the function is CREATE OR
--    REPLACE'd (same signature, same grants), so existing callers are
--    unaffected. Full action inventory after this migration:
--    message_send, swipe, request_send, report_submit, otp_send,
--    profile_update, photo_upload.
-- 2. `active_profiles` VIEW. The default read surface for every future
--    admin/discovery query: profiles whose owner is NOT soft-deleted.
--    `security_invoker = true` (PG15+) means the invoker's RLS on the base
--    tables still applies — the view filters, it never bypasses. Rule: query
--    this view, not `profiles`, unless you can state why deleted accounts
--    must be included (moderation deep-dives; document the reason).
-- ============================================================================

DO $$ BEGIN RAISE NOTICE 'migration 0004 round3: start %', clock_timestamp(); END $$;

-- ── 1. extended allowlist (same signature → drop-free replace) ───────────────
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
  IF p_action NOT IN (
    'message_send', 'swipe', 'request_send', 'report_submit', 'otp_send',
    'profile_update', 'photo_upload'
  ) THEN
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

-- grants survive CREATE OR REPLACE, re-asserted for reviewers grepping this file
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO authenticated;

-- ── 2. privacy-by-default read surface ───────────────────────────────────────
CREATE OR REPLACE VIEW public.active_profiles
WITH (security_invoker = true) AS
SELECT p.*
FROM public.profiles p
JOIN public.users u ON u.id = p.user_id
WHERE u.account_status = 'active' AND u.deleted_at IS NULL;

COMMENT ON VIEW public.active_profiles IS
  'Default read surface: excludes soft-deleted accounts. Query this instead of profiles.';

DO $$ BEGIN RAISE NOTICE 'migration 0004 round3: done %', clock_timestamp(); END $$;
