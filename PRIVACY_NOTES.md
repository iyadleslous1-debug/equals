# PRIVACY_NOTES.md — what we hold, and why

Distinct from SECURITY.md (which is about attackers). This is about OUR OWN
handling of user data — the seed of the real privacy policy. Revisit before
any store submission; both app stores will ask for exactly these answers.

## Data inventory (MVP0 — nothing more exists)

| Data                                      | Where                                                | Why                               | Who can see it                                                               |
| ----------------------------------------- | ---------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------- |
| Email address                             | Supabase Auth (`auth.users`)                         | Login + verification              | You (dashboard), the user                                                    |
| Password hash (bcrypt, Supabase-managed)  | `auth.users`                                         | Login                             | Nobody (not even you — hashes only)                                          |
| Phone number (future)                     | `public.users.phone_number`, NULL today              | Future OTP login                  | You, the user                                                                |
| Display name, age, gender, wilaya, bio    | `public.profiles`                                    | Matching (wilaya/age are filters) | Owner only today (no discovery reads yet); future matches via gated function |
| Photos (URLs)                             | `public.profile_photos.url` (+ object storage later) | Profiles                          | Owner only today                                                             |
| Swipes, requests, conversations, messages | Own tables                                           | Core social loop                  | Participants only (RLS)                                                      |
| Reports, blocks                           | Own tables                                           | Safety                            | Reporter+moderation (service role) / blocker                                 |
| Rate-limit counters                       | `public.rate_limits`                                 | Abuse defence                     | Nobody client-side (no SELECT policies)                                      |
| Crash/error logs (console reporter)       | Device logs only                                     | Debugging                         | Whoever holds the device — nothing leaves it                                 |

## Explicitly NOT collected in MVP0

Precise location (wilaya code 1–58 only), contacts, device IDs for tracking,
message content for analytics, advertising identifiers. Adding any of these
later requires updating this file FIRST, then the policy, then the code.

## Access & retention

- Access today: you, via the Supabase dashboard (full read). No support tool,
  no analytics pipeline, no third party sees anything.
- Retention: active accounts keep everything. Soft-deleted accounts
  (`account_status='deleted'`) keep rows for moderation/legal holds; see
  erasure procedure in `supabase/migrations/ROLLBACK.md`.
- Soft-deleted exclusion is structural, not habitual:
  - `public.active_profiles` view filters retired accounts — the DEFAULT read
    surface for admin/discovery queries (migration 0004).
  - `scripts/seed-dev.mjs` only ever creates `@seed.local` users and wipes
    them on re-run — deleted seed accounts cannot linger across reseeds.
- DZ note: Algeria has no GDPR-equivalent with the same erasure teeth today,
  but Apple/Google review + user trust demand the same posture — act as if
  GDPR applies.

## Before launch, still needed

Plain-language privacy policy screen, consent timestamp on signup, data-export
and erasure request flow, photo-storage region note, DSN/PostHog data-sharing
disclosure the moment either is enabled.
