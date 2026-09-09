# `features/profile` — onboarding wizard + profile ownership

Owns: `(onboarding)` screens, profile CRUD, photo upload/storage, draft
resume, completeness gate.

- Server I/O in `api.ts` (Supabase → `ApiResult`); device picker in
  `pickPhoto.ts`. Upload-then-insert ordering with orphan cleanup on failure.
- Photos: private `profile-photos` bucket, `<userId>/…` paths (storage RLS),
  `url` holds a bucket path (signed URL at read) or legacy absolute URL.
  First photo auto-becomes the card; the partial unique index guards races.
- Draft (`draft.ts`, SecureStore): wizard step + fields only. Photos are read
  live from the server, so resume never shows stale thumbnails.
- Gate: `isProfileComplete` (`validation.ts`) — discovery stays locked until
  every required field validates AND ≥1 photo exists.
- Query keys: `['profile', 'me']`. Mutations invalidate it.
- Copy: English, plain and direct. No profanity blocklist by decision: client lists
  are bypassable theater in any language — the real guards are
  `moderation_status=pending` + reports + server CHECKs.
