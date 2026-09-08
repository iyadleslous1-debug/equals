# SECURITY.md — threat model (MVP0 Round 2)

Living document. Update it whenever auth, schema, or data flows change. If a
new feature touches user data, its PR must state which row of the table below
changes — or explicitly state "no change".

## What we protect

Algerian users' identity (email/phone), age-gated profiles, private messages,
and social-graph signals (who swiped/requested whom). Location is wilaya-level
only — precise coordinates must never enter the schema.

## What RLS protects against (verified by policy inventory, migration 0002)

| Attack                                               | Mitigation                                                                                                                                                                                           |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User A reads user B's profile/messages/requests      | Deny-by-default; every SELECT is scoped to `auth.uid()` ownership or explicit participation. Discovery reads of others are **absent by design** until the MVP1 definer function.                     |
| User writes to another user's profile/photos         | INSERT/UPDATE/DELETE require ownership proofs (direct or via `profiles` subquery).                                                                                                                   |
| Receiver sees who skipped them / mass-scrapes swipes | `swipe_actions` SELECT is sender-only.                                                                                                                                                               |
| Forged sender on messages/requests                   | `WITH CHECK (auth.uid() = sender_id / sender)`.                                                                                                                                                      |
| Joining someone else's conversation                  | `is_conversation_participant()` definer check on every message SELECT/INSERT/UPDATE.                                                                                                                 |
| Tampering with reports (the moderation trail)        | Reports are insert-only for clients; no UPDATE/DELETE policies exist.                                                                                                                                |
| Double-accept / retry-storm status flips             | `guard_request_transition()` trigger (migration 0003): `pending` moves forward exactly once, terminal states immutable, `responded_at` stamped server-side.                                          |
| Abusing send-heavy actions at scale                  | `check_rate_limit()` atomic buckets (migration 0003), allowlisted actions, keyed off `auth.uid()` so buckets can't be spoofed. Client calls it best-effort today; trigger enforcement lands in MVP1. |

## What RLS does NOT protect against (accepted risks + plan)

| Gap                                                         | Status / plan                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deleted users technically retain own-row access until gated | **Known gap.** Soft-delete retires the account (`account_status='deleted'`); the MVP1 bootstrap gate + JWT hook will refuse sessions for retired accounts. `is_active()` already exists for this.                                                                                                                                                                                                                             |
| Client-side validation bypass                               | Expected — zod is UX, Postgres CHECKs are authoritative. Never rely on client validation for security invariants.                                                                                                                                                                                                                                                                                                             |
| Supabase anon key is public by design                       | Fine: it only gets you past the front door; RLS decides every room. The **service-role key must never ship** — CI greps client dirs for it, and `scripts/seed-dev.mjs` takes it from shell env only.                                                                                                                                                                                                                          |
| No end-to-end encryption on messages                        | Out of scope for MVP. Transport is TLS; at-rest is Supabase disk encryption. Document before promising "private" anywhere in UI copy.                                                                                                                                                                                                                                                                                         |
| Email enumeration via signup/signin responses               | Supabase returns distinct errors; our `friendly()` copy softens but doesn't eliminate the oracle. Acceptable for MVP0; revisit with ambiguous responses if abuse appears.                                                                                                                                                                                                                                                     |
| Storage buckets (photo uploads)                             | Private `profile-photos` bucket, owner-scoped `<uid>/…` paths, signed-URL reads, never public-read. Audit finding: the Storage API writes with no caller JWT claims, so enforcement is app-level owner paths (probed: cross-user writes denied) with storage RLS as defense-in-depth for direct SQL — NOT the reverse. Upload rate has no trigger for the same reason; abuse is bounded by MAX_PHOTOS + row-path rate limits. |
| WebView / remote HTML rendering                             | **Forbidden in MVP0** (no-WebView rule). When needed: `isSafeExternalUrl()` gate, origin allowlist, no JS bridge. No CSP to configure until then.                                                                                                                                                                                                                                                                             |
| Push notifications                                          | Not built. When added: tokens stored per-user with owner-only RLS, sent via edge function with service role.                                                                                                                                                                                                                                                                                                                  |

## Deletion model (decision — confirm or override)

**Soft-delete.** App-level deletion sets `account_status='deleted'` + `deleted_at`;
rows everywhere are preserved for moderation/legal holds. Physical erasure is a
documented two-person admin SQL operation (`supabase/migrations/ROLLBACK.md`).
Rationale: a social app that hard-deletes on request destroys abuse evidence
and breaks conversation history for the other party. Override path: if hard
privacy law requires immediate erasure, the existing `ON DELETE CASCADE` chain
already supports it — flip the app path to `DELETE FROM users` and accept the
moderation trade-off.

## Audit checklist (run before every release)

1. `node scripts/audit-gate.mjs` green (CI enforces; reviewed upstream-toolchain
   exceptions live in the script — never allowlist app-runtime advisories).
2. Service-role grep clean (CI enforces).
3. `supabase db reset` applies all migrations without errors.
4. Negative RLS probes pass: B cannot SELECT A's profile/requests/messages;
   B cannot UPDATE A's pending request; second accept on one request errors.
5. `types/database.ts` matches `supabase gen types` output (no drift).
