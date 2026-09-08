# FOUNDATION.md — the whole MVP0 in 10 minutes

DZ Connect: social discovery for Algeria. MVP0 built the ground; MVP1 builds
rooms. Read this, then `CONTRIBUTING.md` before writing feature code.

## 1. Stack (30 seconds)

Expo SDK 52 · TypeScript strict · Expo Router · NativeWind · Zustand (client
state) · React Query (server state, NetInfo-aware) · Supabase (Postgres 15 +
Auth) · zod validation · Jest · ESLint/Prettier/Husky · GitHub Actions
(lint → typecheck → tests → audit-gate → secret-scan).

## 2. Schema (3 minutes)

Nine tables + two helpers. Full DDL in `supabase/migrations/0000–0004`
(Rollback in `ROLLBACK.md`; seed via `npm run seed:dev`).

| Table             | Key columns                                                                                 | Reads (RLS)                                    |
| ----------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `users`           | `id` (= auth id), `phone_number` NULL, `account_status`, `deleted_at`                       | own row                                        |
| `profiles`        | `user_id` UNIQUE, `display_name`, `age`, `gender`, `wilaya` 1–58, `bio`                     | own row (+ `active_profiles` view for tooling) |
| `profile_photos`  | `profile_id`, `url`, `order_index`, `is_card_photo` (one per profile, partial unique index) | own (via profile)                              |
| `swipe_actions`   | `swiper_id`, `swiped_id`, `skip\|request`, UNIQUE pair, append-only                         | sender only                                    |
| `friend_requests` | `sender/receiver`, `pending\|accepted\|declined\|canceled`, one-way state-machine trigger   | participants                                   |
| `conversations`   | canonical `a<b` pair, UNIQUE, `last_message_at` auto-touched                                | participants                                   |
| `messages`        | `conversation_id`, `sender_id`, `content_text` ≤1000, `read_at`                             | participants (definer helper)                  |
| `reports`         | `reporter/reported`, reason, `open\|reviewing\|actioned\|dismissed`, insert-only            | reporter                                       |
| `blocks`          | `blocker/blocked`, UNIQUE pair                                                              | blocker                                        |
| `rate_limits`     | atomic `check_rate_limit()` buckets (7 actions)                                             | nobody (definer fn only)                       |

**Final audit (Round 3), all confirmed:**

- Every FK carries explicit `ON DELETE CASCADE` — physical erasure cascades
  cleanly; the app path is soft-delete (`account_status='deleted'`), never
  hard-delete.
- Every nullable column has a reason: `phone_number` (email signups),
  `bio`/`description` (optional), `responded_at`/`read_at`/`deleted_at`
  (event hasn't happened).
- Every enum-like column has a CHECK: `account_status`, `gender`, swipe
  `action`, request `status`, report `status`, plus `age ≥ 18`,
  `wilaya 1–58`, self-reference guards (`<>`), canonical pairs (`a<b`).
- RLS: 9/9 tables enabled, 27 policies, deny-by-default. No dashboard SQL
  ever — migrations are the source of truth.

## 3. Auth flow (2 minutes)

Email + password (free). `signUpWithEmail` → 6-digit confirmation email →
`verifyEmailOtp(type:'signup')` → session in SecureStore → `users` row created
by trigger. Signin rejects unconfirmed emails with an actionable message.
Resends throttled (60s / 3-per-10min, shared limiter). Phone/OTP ships later
as `lib/auth/phone.ts` fill-in: column, trigger, types and throttle already
ready; SMS stays dormant (`lib/sms.ts`). Import auth only from `@/lib/auth`.

## 4. Security model (2 minutes)

Deny-by-default RLS → Postgres CHECKs (authoritative) → zod (UX) — in that
order of trust. Request transitions are trigger-guarded (no double-accept
races). Rate budgets exist per action (trigger enforcement in MVP1). Crash
boundary + console reporting (Sentry = one env var). Secrets: anon key in app
(bundle-safe, RLS-gated), service-role in shell-only scripts, CI greps +
secret-scans every push. Full model: `SECURITY.md`. Privacy inventory:
`PRIVACY_NOTES.md`. Abuse ladder: `docs/abuse-policy.md`.

## 5. Known gaps (1 minute — none block MVP1)

1. Migrations staged, not yet applied — needs Docker + `supabase db reset`.
2. No staging/prod Supabase projects yet — templates ready.
3. RLS negative probes + restore drill documented, awaiting first manual run.
4. Deleted-user session gate + discovery definer function + rate-limit
   triggers are specified, build in MVP1.
5. Audit allowlist: 13 upstream-toolchain advisories, review by 2026-12-08
   (gate reminds automatically).

## 6. What MVP1 adds (90 seconds)

Auth screens → profile CRUD (zod everywhere) → deck via the discovery
function → requests with transition trigger already guarding → chat on the
conversations/messages tables → `is_active()` bootstrap gate → rate-limit
triggers → appeal tickets. No schema rework, no auth rework, no new infra.

**Verdict: foundation is READY. Build features.**
