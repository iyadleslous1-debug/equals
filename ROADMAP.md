# ROADMAP — Equals, Now → Publish

Status: MVP1 fully built, tested, hardened. MVP2 code-complete, pending
device test. Branding runs on a separate track (Kimi).

## PHASE 0 — Already done ✅

- Backend: auth, database, RLS security, storage, real-time infra.
- MVP1: signup/login, onboarding + photos, discovery, requests, chat,
  report/block. Audit + hardening pass. Expo 57. 303 tests, all security
  paths probed live.

## PHASE 1 — Finish MVP2 (smarter matching) — nearly done

- [x] Personality survey (10 questions, skippable, deferrable prompt)
- [x] Compatibility scoring (deterministic, deck order only)
- [x] Profile detail view (gallery, badge, request/skip)
- [x] Filters (age, wilayas, sort — persisted on profile row)
- [ ] Device test pieces 1–4 ← NEXT
- [ ] Full branding applied to every screen (from Kimi's direction)

## PHASE 2 — MVP3: retention & habit loop

Goal: a reason to open daily. Day-7 / Day-30 retention is the metric.

- Daily login streak (counter only, no rewards yet)
- "Top pick of the day" (one highlighted profile from compatibility)
- Push notifications (new request, new message, mutual match) — needs Expo
  push tokens, backend dispatch, preferences screen, quiet hours
- "Active recently" badge (privacy-conscious, no exact last-seen)
- Re-engagement policy for dormant users (decide, don't build blind)

## PHASE 3 — MVP4: monetization test

Goal: real conversion rate. Resolve CIB/Edahabia (or equivalent) for real.

- One single paid tier: see who requested you early, higher limits,
  basic privacy control
- Subscriptions (start/cancel/status), free trial, receipts/refunds
- Terms covering payments + published refund policy

## PHASE 4 — MVP5: social layer (ONLY with strong Phase 2–3 signal)

- Groups (size + moderation model decided first), posts, group chat
- Expanded moderation tooling (report/block alone won't cover groups)

## PHASE 5 — Full vision (only what data justifies)

- 5a matching: AI embeddings, icebreaker generator, curated picks
- 5b privacy: full ghost mode, who-can-see-me controls
- 5c gamification: points (utility defined first), collectibles, streaks,
  levels, leaderboards, challenges
- 5d rich profiles: voice notes, video intros, playlists, highlights
- 5e tiers: Free / Plus / Pro / Pro Max (after base monetization works)

## PHASE 6 — Pre-launch hardening (REQUIRED regardless)

- Staging + production Supabase projects; all migrations + probes re-run
  hosted; secrets via CI/CD; hosted backup/restore drill
- Monitoring (Sentry DSN — scaffolded) + analytics (PostHog — scaffolded)
- Load/stress testing for initial volume
- Legal: real ToS + Privacy Policy (PRIVACY_NOTES.md is the seed),
  Algeria data-residency/age-verification review, public moderation policy,
  ban/appeal process implemented
- Moderation operations: who reviews day-to-day, response targets,
  escalation process
- Stores: Apple ($99/yr) + Google ($25) accounts, screenshots, copy,
  privacy labels, 17+/18+ rating, review-guideline check, TestFlight /
  internal-track beta
- Final QA: full manual regression iOS + Android, a11y audit, low-end
  perf audit, repeat security review

## PHASE 7 — Launch

- Soft launch (one city or invite-only) → monitor 1–2 weeks → public.
