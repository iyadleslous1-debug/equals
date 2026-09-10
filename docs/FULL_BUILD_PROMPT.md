# FULL BUILD PROMPT — Equals (copy everything below the line into the new AI)

---

You are taking over as the sole developer of **Equals**, a mobile social
discovery app. It is FULLY BUILT through MVP3-backend (app code, database,
security, tests, UI system). Your job: understand everything below, then
continue from ROADMAP.md. Do not rebuild what exists. Do not "improve" by
rewriting. Follow the conventions exactly.

## 1. PRODUCT

- **What**: meet people for friendship or romance. Global audience,
  English-only copy, dark-only UI. Explicitly NOT disguised — the app may
  say it is for dating and friendship directly.
- **Core loop (never break it)**: sign up → onboarding (profile + photos)
  → Discover deck → send request → accept → chat. Survey NEVER gates
  discovery. Filters narrow, never bypass safety.
- **Permanently out of scope** (do not build unless told): AI/embeddings
  matching, points/subscriptions/payments, groups/posts/feed, gamification
  (streaks UI, levels, badges, leaderboards), voice/video, icebreakers,
  ghost mode, light theme, remote fonts.
- **Open questions (decide WITH the owner, never alone)**: replace the
  58-wilaya location system with city/country; push-notification
  credentials; Phase 2+ scope.

## 2. STACK (exact, do not upgrade without reason)

Expo SDK 57 (`expo ~57.0.21`, `expo-router ~57.0.20`), React 19.2.3,
React Native 0.86.3, TypeScript 6.0.3, NativeWind, TanStack Query v5,
Zustand, Supabase (local dev `http://127.0.0.1:54321`, Studio `:54323`),
Jest + RTL 14, zod, reanimated 4, gesture-handler, expo-haptics,
expo-blur, expo-image, expo-linear-gradient, Ionicons.
Packages install with `npx expo install <pkg>` ONLY (never bare npm).
`npx expo-doctor` must stay 21/21.

## 3. REPO LAW (violations get reverted)

- `app/` = Expo Router routes only, no business logic. Routes:
  `index.tsx` (AuthGate), `(auth)/signup|login|confirm`,
  `(onboarding)/setup`, `(tabs)/discover|requests|chat`, `chat/[id]`,
  `profile/[id]`, `survey.tsx`, `_layout.tsx` (providers + stack
  animations; survey = bottom modal).
- `features/<name>/` = `api.ts` (Supabase → `ApiResult`), `hooks.ts`,
  `components/`, `store.ts` if needed, `README.md`. **Features never
  import each other.** Shared code goes in `lib/` or `hooks/`.
- `components/` = presentational only (no Supabase/React Query imports).
- `lib/` = `supabase`, `auth/`, `result` (ApiResult/ok/err/toAppError),
  `logger` (structured + `redact()` deny-list + `maskPhone`),
  `reporting` (console now, Sentry later — context extras ARE redacted),
  `config` (fail-fast env), `validation/schemas` (ALL zod schemas),
  `storage-url` (signed URLs; https passthrough ONLY for Supabase host +
  picsum legacy), `sms` (dormant providers), `compatibility`
  (band/orderByScore), `activity` (streak/heartbeat, never throws),
  `animation` (bezier/spring data), `haptics` (named calls), `pair`,
  `security` (`isSafeExternalUrl`), `health`, `perf`.
- `types/database.ts` = GENERATED, never hand-edit
  (`node scripts/gen-types-local.mjs` — never shell-redirect, PowerShell
  re-encodes to UTF-16 and corrupts it; learned the hard way).
- Naming: files `camelCase.ts`/`PascalCase.tsx`, folders singular
  lowercase, functions `camelCase`, types `PascalCase`,
  `SCREAMING_SNAKE` constants, DB `snake_case`, migrations
  `<UTC-timestamp>_slug.sql`. Commits: `type(scope): subject`
  (feat/fix/chore/docs/refactor/test/ci).
- Copy: plain direct English. Error codes stable (`domain/reason`,
  routing NEVER matches on message text). French/Darja: zero tolerance,
  grep `[éèêëàâçîïôöùû]` must return nothing in source.

## 4. DATABASE (Supabase Postgres, 21 migrations, append-only)

Tables: `users` (id, account_status, deleted_at, last_active_at —
client writes to last_active_at are trigger-reverted),
`profiles` (+ filter_age_min/max, filter_wilayas, filter_sort),
`profile_photos` (moderation_status pending/approved/rejected),
`friend_requests` (pending/accepted/declined/canceled),
`conversations` (canonical a<b ordering), `messages`,
`swipe_actions` (UNIQUE pair, 60/min trigger), `blocks`,
`personality_surveys` (PK profile_id, answers jsonb + object CHECK,
completed_at), `user_stats` (streaks, own-read only, no write policies).
View: `active_profiles` (excludes deleted/suspended).
RLS: deny-by-default, `ENABLE ROW LEVEL SECURITY` + select/insert/update/
delete own-row policies on EVERY table in the same migration.
Functions (all `SECURITY DEFINER`, `SET search_path = public`, REVOKE
PUBLIC/anon, GRANT authenticated+service_role):
`get_discovery_candidates(limit, age_min, age_max, wilayas, sort)` —
excludes self/swipes/blocks/inactive/photo-less, random or newest;
`get_request_inbox()`, `get_conversation_previews()`,
`get_compatibility(user_ids)` → (user_id, score) ONLY, never answers;
`get_profile_gallery(user_id)` → (url, is_card_photo, order_index);
`get_my_blocks()` → (blocked_id, display_name) [DRAFTED, uncommitted];
`record_login()` (UTC-day streaks, race-safe, future-proof);
`touch_activity()` (5-min throttle via tx-local flag);
`survey_score(a,b)` (weights hobbies-Jaccard×20, vibe×15,
sports/cooking/travel×10, kids×10, smoking×5,
rhythm×8, family/career×6 = 100; NULL-proofed).
Triggers: request-transition state machine (double-accept rejected),
message/conversation immutability, block-lock (P0002), swipe/request/chat
rate limits (P0001), updated_at touchers, active_at anti-forgery.
Migration workflow: `npx supabase migration new <slug>` (CLI hangs
sometimes — create `<timestamp>_slug.sql` manually if so), `npx supabase
db reset`, `npm run seed:dev`, regen types, re-run ALL probes.

## 5. AUTH

Email+password (Supabase, free tier). `lib/auth/`: `email.ts` (live),
`phone.ts` (fail-closed stubs), `validation.ts`, `index.ts` façade —
features import ONLY `@/lib/auth`. Pending-email SecureStore resume,
resend countdown with server retryAfter, cache-purging logout.
`getCurrentUserId()` is the single signed-in-id helper. Test accounts:
`dev-0X@seed.local / Seedpass123!` (8 users, 4 with surveys, blocks,
convos — see `scripts/seed-dev.mjs`).

## 6. FEATURES (what each does — preserve behavior)

- **discover**: deck (React Query, 20s stale), request/skip (idempotent
  already-recorded), swipeable cards (pan + tilt, spring-back always;
  buttons primary), compat ordering ONLY when viewer surveyed (server
  order otherwise; skipped for sort=newest), filters (persisted, dot
  indicator, sheet), survey prompt (deferrable, session-dismiss, resume
  variant), safety sheet, position clamp (empty state past end).
- **requests**: received/sent sections, stable callbacks, memo rows,
  toasts on accept/decline.
- **chat**: realtime `postgres_changes` + foreground refetch, outbox
  (pending/failed/retry), mark-read (silent + reported), paginated
  load-more, block-locked input state, stable renderItem + memo bubbles.
- **safety**: report (6 English reasons, immutable rows) / block /
  unblock sheets on deck + thread; blanket cache bust on block.
- **survey**: 10 tap-only questions (hobbies multi≤3, vibe, rhythm 1–5,
  sports, cooking, travel, family 1–5, career 1–5, kids, smoking),
  zod-strict, API re-validates, stored rows re-validated on read
  (bad → null), session-dismiss prompt.
- **profile detail** (`/profile/[id]`): swipeable gallery (signed URLs),
  Great/Good badge only (low scores silent), request/skip + deck
  invalidate + back, unavailable dead-end (never stale bio/actions),
  double-tap gated, wilaya validated.
- **retention**: claim-once-per-user-per-day login, foreground heartbeat
  (client 5-min throttle), never-throw telemetry.

## 7. UI SYSTEM (KIN spec implemented — `docs/KIN_UI_SPECIFICATION.md`)

Tokens: bg `#0f1419`, card `#1a2028`, elevated `#252d38`,
primary `#3368a0`, onPrimary `#ffffff`, secondary `#66a3bf`,
tertiary `#c8dfdb`, text `#f2efe7`, muted/faint `#8a9ba8`,
border `#2a3441`, destructive `#e5484d`, success `#30a46c`,
warning `#f5a524`, + primaryTint/scrim alphas. `theme.test.ts` asserts
tailwind↔theme mirror — update BOTH or the build fails.
Motion: springs/150–600ms tokens, press-scale + haptics on all buttons,
blur+drag sheets, slide/fade toasts (4s), Reveal cascades, form shake,
custom tab bar (safe-area aware), stack transitions.
Adaptations baked in (do not "fix"): system fonts (offline rule),
own Button/Chip prop APIs, spring-back swipe (no stranded cards),
`react-hooks/immutability` disables on animation files (reanimated API),
hand-rolled reanimated jest mock (`__tests__/mocks/reanimated.js`).
Screens covered: auth stagger, onboarding, deck+cards+badge, requests,
chat, survey, detail, filters, all sheets/states.

## 8. TESTING (gates are non-negotiable before every commit)

`npm run test:ci` (300+ tests, thresholds in jest.config.js),
`npm run lint` (zero warnings), `npm run typecheck`,
`node scripts/scan-secrets.mjs`, `npx expo-doctor`.
Unit: pure logic + mocked Supabase (see `__tests__/surveyApi.test.ts`
for the mock pattern). Live RLS/security probes per surface:
`scripts/verify-{rls,profile,discovery,requests,chat,safety,survey,
compatibility,gallery,filters,retention,my-blocks}.mjs` — each asserts
negative cases (cross-user denied, anon rejected) AND restores fixtures
(seed surveys/photos must survive a probe run).
Env for scripts (PowerShell):
`$env:SUPABASE_URL="http://127.0.0.1:54321"`,
Set the three env vars from `supabase status` (URL, service-role secret,
publishable key) in your shell first — real values stay out of the repo.
NEVER probe anything matching /prod/ (scripts refuse).

## 9. KNOWN GOTCHAS (learned, do not relearn)

- `.env.local` beats everything; device needs LAN URL
  (check `Get-NetIPAddress`, Wi-Fi IP changes across networks).
- `useDeck`-style hooks: never call hooks after early returns.
- Position/index state vs async-reordered lists: direct index +
  empty-state, never clamp-to-last (reshow loop).
- Expo typed routes regenerate on `expo start`; stale types error on
  new routes — boot Metro briefly after adding a route.
- `supabase gen types --linked` hangs when cloud unreachable → use the
  local script. Never `>`-redirect generator output in PowerShell.
- Test IDs/roles/labels are API — NSwag-level care when restyling.
- `git add -A` sweeps parked drafts: ALWAYS `git status` before commit.
- Fake timers + toast durations must match (4000+250 exit).
- FlatList rows beyond viewport don't mount in tests — search first.

## 10. WHERE THINGS STAND + WHAT'S NEXT

Done through MVP3-retention-backend, all pushed to `origin/master`.
Uncommitted drafts on disk: Profile-tab/blocks UI push (parked by owner).
Next, in order: (1) device-test MVP2+retention on Expo Go,
(2) Profile tab (info, streak display, survey entry, blocked list,
logout), (3) top-pick-of-day, (4) branding application, (5) push
infrastructure (needs FCM/APNs credentials), then roadmap Phases 2–7
(retention metrics → monetization → social → vision → hardening → launch).
Workflow per piece: plan → confirm → TDD red → implement → fresh-context
review → full gates → commit → push → device test. Update PROGRESS.md
every finished step.
