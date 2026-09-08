-- ============================================================================
-- MVP1 · photo hardening: moderation self-approval ban + atomic card switch.
-- ============================================================================
-- 1. OWNERS CANNOT TOUCH `moderation_status`. The column defaults to
--    `pending`; only moderation tooling (service_role, which has no
--    `auth.uid()`) may change it. Without this trigger the owner-scoped
--    UPDATE policy lets any client self-approve — defeating the control the
--    app's "En révision" UX is built on.
-- 2. `set_card_photo()` — single-statement card switch scoped to the caller's
--    own profile. The previous clear-then-set in app code left a window with
--    zero cards and could strand it there on failure. Returns true when a row
--    moved, false when the photo is not yours (RLS still applies — plain
--    function, NOT security definer).
-- ============================================================================

-- ── 1. moderation self-approval ban ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.forbid_moderation_self_write()
RETURNS TRIGGER AS $$
BEGIN
  -- service_role (moderation tooling) has no auth.uid(): always allowed.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' AND NEW.moderation_status <> 'pending' THEN
    RAISE EXCEPTION 'moderation_status is server-managed';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.moderation_status IS DISTINCT FROM OLD.moderation_status THEN
    RAISE EXCEPTION 'moderation_status is server-managed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS profile_photos_moderation_guard ON public.profile_photos;
CREATE TRIGGER profile_photos_moderation_guard
  BEFORE INSERT OR UPDATE ON public.profile_photos
  FOR EACH ROW EXECUTE FUNCTION public.forbid_moderation_self_write();

-- ── 2. atomic card switch ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_card_photo(p_photo_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  SELECT profile_id INTO v_profile_id
  FROM public.profiles
  WHERE user_id = auth.uid();

  IF v_profile_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.profile_photos
  SET is_card_photo = (id = p_photo_id)
  WHERE profile_id = v_profile_id;

  RETURN EXISTS (
    SELECT 1 FROM public.profile_photos
    WHERE profile_id = v_profile_id AND id = p_photo_id AND is_card_photo
  );
END;
$$ LANGUAGE plpgsql SET search_path = public;
