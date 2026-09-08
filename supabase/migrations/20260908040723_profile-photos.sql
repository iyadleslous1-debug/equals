-- ============================================================================
-- MVP1 · profile photos: moderation state + private storage bucket.
-- ============================================================================
-- 1. `moderation_status` on `profile_photos`. Owners see their own pending
--    photos as "under review" (never hidden silently); approval tooling flips
--    the flag via service_role. No RLS change needed — the existing
--    owner-scoped policies already cover the new column.
-- 2. Private `profile-photos` bucket. Files live under `<user_id>/…` so every
--    storage policy keys off `auth.uid()` exactly like table RLS. Signed URLs
--    for reads (no public-read policy exists anywhere); never add one.
-- ============================================================================

-- ── 1. moderation state ─────────────────────────────────────────────────────
ALTER TABLE public.profile_photos
  ADD COLUMN moderation_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (moderation_status IN ('pending', 'approved', 'rejected'));

-- ── 2. private bucket ───────────────────────────────────────────────────────
-- This storage version has no `public` flag on buckets: privacy comes purely
-- from RLS. The bucket is private because NO public-read policy exists below
-- — only owner-scoped authenticated policies. Never add one.
INSERT INTO storage.buckets (id, name)
VALUES ('profile-photos', 'profile-photos')
ON CONFLICT (id) DO NOTHING;

-- storage.objects already has RLS enabled (Supabase-managed). Owner-scoped
-- policies for this bucket only; first path segment must be the caller's id.
CREATE POLICY "profile_photos_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "profile_photos_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "profile_photos_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );

CREATE POLICY "profile_photos_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND auth.uid()::TEXT = (storage.foldername(name))[1]
  );
