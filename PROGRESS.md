# PROGRESS — DZ Connect

Maintained after every finished step. Newest at the bottom.

## MVP0 — foundation ✅

- Schema, RLS (10 tables / 27 policies), seed (8 users/profiles, 24 photos,
  swipes, 3 requests, 2 convos, 5 messages, 1 block), email+password auth.
- Verified: 5/5 migrations, RLS probes 3/3, `pg_dump` restore 9/9.
- Seed logins: `dev-0X@seed.local / Seedpass123!`.

## Design system + primitives ✅

- Tokens (`tailwind.config.js`, `constants/theme.ts`), MASTER.md v2, 6 docs.
- 14 shared primitives, TDD'd (96/96 tests then).

## MVP1 — six pieces ✅

1. Auth (signup/login/confirm, gate, logout) — `5a48493`
2. Onboarding wizard + photo storage + moderation — `d6e9a22`, `c3d6de8`
3. Discovery deck + request/skip + tabs — `30e7b80`
4. Requests inbox + mutual accept — `c37766c`
5. Chat threads + outbox + block-lock — `59af730`
6. Safety report/block + toast — `f5e2a67`

## SDK climb 52 → 57 ✅

- Via 53/54/55, RTL 13→14 codemod, babel presets fix, `/setup` route fix,
  LAN-http for devices, patches 57.0.21/57.0.20. Doctor 21/21. (`149e71c`)

## Audit S1–S7 + independent reviews ✅

- Dedupe, DB hardening, throw-path recovery, a11y labels, memo perf,
  coverage 61.8% → 78.2%, review wave (storage allowlist, SMS HTTPS gate,
  log/Sentry redaction, stable memo rows). Zero blockers.
- Gate: 235/235 tests, lint, typecheck, secret scan, all 6 probe suites.

## Pivot: global + English ✅ (`ef26cf1`, 82 files)

- Full French→English sweep (screens, errors, validation, tests, seed, docs).
- Open dating-and-friendship positioning. Zero logic changes.
- Wilaya mechanism + data kept (broader location = open question).

## MVP2 pieces 1–4 — code-complete ✅

- Piece 1 survey (`34d2423`): `personality_surveys` + own-row RLS (7/7
  probes), 10-question zod-strict schema, deferrable prompt, `/survey`.
- Piece 2 scoring (`1972262`): `get_compatibility` RPC (scores only),
  weights sum to 100, deck ordering when surveyed. 7/7 probes.
- Piece 3 profile detail (`3e3820d`): `get_profile_gallery` RPC (deck
  exclusions mirrored), `/profile/[id]`, badge, request/skip. 8/8 probes.
- Piece 4 filters (`84d8839`): profile-row prefs, deck RPC params,
  FilterSheet, header button + dot. 5/5 probes.
- Gate: 303/303 tests, lint, typecheck, secret scan, reviews zero blockers.

## Branding — separate track via Kimi ⏸️

- In-app warm-spark proposal presented but NOT applied; branding now runs
  as its own track. Full branding application is part of MVP2 completion
  (Phase 1 below), from Kimi's direction.

## KIN UI overhaul — IN PROGRESS

- Spec: `docs/KIN_UI_SPECIFICATION.md` (Deep Ocean blue, motion-first).
- Done: 5 packages (gesture/haptics/blur/image/gradient, doctor 21/21),
  Kin tokens, animation/haptics libs, primitives (button/input/chip/icon/
  avatar/sheet/modal/toast/states/tabbar), swipeable deck, card compat
  badge, restyled bubbles/rows/tiles, Reveal + form shake, stack
  transitions, jest native mocks. Adaptations logged in commit.
- Gate: 305/305 tests, lint, typecheck green.
- UI WORK PAUSED by decision: final finish pass comes last. Following ROADMAP.

## MVP3 — retention backend: IN PROGRESS
