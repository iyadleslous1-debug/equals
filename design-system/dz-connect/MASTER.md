# DZ Connect — Design System Master

> **LOGIC:** When building a specific screen, first check `design-system/dz-connect/pages/[screen].md`.
> If that file exists, its rules **override** this Master. Otherwise follow this file strictly.
> Every screen delivery must also pass the Pre-Delivery Checklist at the bottom.

**Project:** DZ Connect (social discovery, Algeria, 18+)
**Generated:** 2026-09-08 · **Adapted by:** ui-ux-pro-max (verified against product/platform — raw output was marketing-web oriented and was deliberately overridden: dark-first per existing `void`/`ink` tokens, restrained palette for a conservative market, system fonts for Arabic-script safety, app-screen rules instead of landing-page rules)
**Stack:** Expo SDK 52 · React Native · NativeWind (Tailwind) · Expo Router

---

## 1. Foundations

### Color (dark-first; light theme is explicitly out of MVP1 scope)

| Token (Tailwind) | Hex       | Use                                                                                |
| ---------------- | --------- | ---------------------------------------------------------------------------------- |
| `void`           | `#0F0B1E` | App background                                                                     |
| `ink`            | `#17122B` | Surface / cards                                                                    |
| `elevated`       | `#241B40` | Raised cards, sheets, modals                                                       |
| `primary`        | `#D9A441` | CTA fill, active states, focus ring (gold = trust/warmth, no flashy dating energy) |
| `onPrimary`      | `#0F0B1E` | Text/icons on primary (≈7:1)                                                       |
| `secondary`      | `#8B7BC7` | Links, secondary actions, selected tabs                                            |
| `text`           | `#F4F1FA` | Primary text (≥12:1 on void)                                                       |
| `muted`          | `#B8B0D1` | Secondary text (≈7:1 on void)                                                      |
| `faint`          | `#8A83A3` | Hints, placeholders, timestamps (large/secondary only)                             |
| `border`         | `#2E2547` | Dividers, input borders, card outlines                                             |
| `destructive`    | `#DC2626` | Destructive fill; `onDestructive` `#FFFFFF` (≈4.5:1)                               |
| `warning`        | `#F59E0B` | Countdowns, expiry, pending-review flags; `onWarning` `#0F0B1E`                    |
| `success`        | `#34D399` | Confirmations, sent states                                                         |

Rules: semantic tokens only — never hardcode hex in screens. Disabled = `faint` text on `border` fill, non-interactive. Scrim = black 60% over real background, re-check foreground legibility.

### Typography (system stack — Arabic/Darja-safe, offline-safe)

- **Family:** System everywhere (`fontFamily.display: System`). No remote fonts in MVP1 (Google-Fonts import would break offline + Arabic-script rendering; revisit only with bundled `expo-font` + Arabic-capable family).
- **Scale:** display 28/700 · title 22/700 · subtitle 17/600 · body 16/400 · caption 13/400 · button 16/600.
- **Rules:** allowFontScaling stays ON (Dynamic Type); test largest size per screen; never truncate names to one line without `numberOfLines` + ellipsis; bilingual-ready strings (see §4).

### Spacing, shape, motion

- **8dp grid**, rhythm tiers 4/8/12/16/20/24/32/40/48/64 (see `constants/theme.ts` `SPACING` — the enforceable source; tiers are unit-tested to stay multiples of 4).
- **Radius:** 12 inputs/buttons · 16 cards · 24 sheets · full avatars (`RADIUS`).
- **Elevation (tokenized per platform, never inlined):** card 2 · sheet 4 · modal 8 (`ELEVATION`: Android `elevation` + iOS shadow pair).
- **Animation (subtle tier):** 150/200/300ms (`ANIMATION.duration`) + one spring preset for card gestures; reduced-motion kills choreography, keeps static end-states.
- **Icons:** 20/24/32 (`ICON_SIZE`); **touch:** ≥44pt iOS / ≥48dp Android with `hitSlop` 10 (`HIT_SLOP`).
- **Haptics (subtle only):** light press on primary actions · success notification on sent/accepted · error notification on destructive confirm. Never on scroll, typing, or polling.

### Icons & touch

- **Family:** `@expo/vector-icons` (Ionicons), single family per screen, 24pt default tokens (sm 20 / md 24 / lg 32), 2px-equivalent stroke consistency.
- **Targets:** ≥44×44pt iOS / ≥48×48dp Android; `hitSlop={top:10,bottom:10,left:10,right:10}` on anything visually smaller. No emoji as structural icons, ever.

---

## 2. Trust rules (product-specific, non-optional)

1. **Direct, honest copy** — the app is openly for friendship or romance and may say so. English default, short sentences, no idioms that break translation.
2. **User controls exposure** — card shows only what the user put on their profile; `is_card_photo` is their explicit choice. Never auto-promote a photo.
3. **No gendered assumptions** in copy or flows (matching is user-driven; UI never presumes who sees whom).
4. **Safety is first-class UI** — report/block entry points reachable from every profile/card/conversation; confirmations use plain language ("Block Amine? They won't be able to see you or message you.").
5. **"Under review" transparency** — pending-moderation photos show their state to the owner; nothing safety-relevant is hidden silently.
6. **Wilaya, not location** — never render maps, distances, or anything implying precise location.

## 3. Screen architecture (applies to every MVP1 piece)

- **Route groups:** `app/(auth)/` (signup/login/confirm), `app/(onboarding)/`, `app/(tabs)/` (discover/requests/chat/profile). Route files compose from `features/*` + `components/` only (CONTRIBUTING.md).
- **Every screen ships 4 states:** loading (skeleton/spinner, never blank) · content · empty (respectful, actionable) · error (human message + retry action, never raw errors).
- **Forms:** labels + hints on all fields; validate on blur, confirm on submit; inline error under each field (`aria-describedby` equivalent via `accessibilityDescribedBy`); failed submit moves screen-reader focus to an error summary linking each field (verified ux-guideline: focusable error summary). Countdown timers announced politely, not per-second.
- **Lists:** `FlatList` virtualized, `LIST_STALE_TIME_MS` freshness, pull-to-refresh + background refetch (stale-sender problem), keyed stable IDs.
- **Realtime-sensitive screens** (requests/chat) refetch on foreground (`AppState`) at minimum; full Realtime decision lands in Piece 5 plan.
- **Breakpoints:** 375 (small phone, primary target) · 768 (tablet portrait: gutters 24, cap content 640 centered) · 1024/1440 (landscape/tablet: two-pane where it aids chat/requests, never stretched edge-to-edge text).

## 4. Copy & i18n posture

- UI strings live next to features (no scattered literals); English default.
- Bios/user content render verbatim in any language with system fonts; `numberOfLines` guards everywhere.
- Numbers/dates: wilaya shown as `Wilaya 16 — Alger` via `constants/wilayas.ts` (never bare codes in UI).

---

## Pre-Delivery Checklist (per screen — verify explicitly, report pass/fail)

**Visual:** no emoji icons · one icon family · pressed states don't shift layout · tokens only, no hex.
**Interaction:** pressed feedback ≤150ms · targets ≥44/48 · disabled states unambiguous · no nested tap/drag conflicts (swipe cards get button alternatives for accept/skip).
**Contrast (dark):** body ≥4.5:1 · dividers/borders visible · scrim measured on real background.
**Layout:** safe areas (notch/gesture bar) · content not hidden behind fixed bars · 375 + landscape checked · gutters adapt ≥768 · 8dp rhythm.
**Accessibility:** decorative icons hidden from screen reader · icon buttons named with state · fields labeled with inline errors + submit summary focus · color never the sole signal · reduced-motion + largest Dynamic Type checked · auth allows paste + password managers.
**Product:** loading/empty/error states real · RLS-safe queries only · direct English copy · report/block reachable where a stranger is shown.

## Component-states matrix (every component × applicable states)

| Component     | loading                   | empty                         | error                       | disabled                             | pressed                                    | long content                             | offline                                 |
| ------------- | ------------------------- | ----------------------------- | --------------------------- | ------------------------------------ | ------------------------------------------ | ---------------------------------------- | --------------------------------------- |
| Button        | spinner, no layout shift  | n/a                           | n/a                         | `faint` on `border`, non-interactive | opacity/elevation ≤150ms                   | label truncates 1 line                   | tap → queued-or-explained, never silent |
| IconButton    | n/a                       | n/a                           | n/a                         | 40% opacity, no action               | opacity + hitSlop kept                     | n/a                                      | same as Button                          |
| Input         | n/a                       | hint text                     | inline error + summary link | `border` fill, `faint` text          | focus ring `primary`                       | multiline grows to 4 lines, then scrolls | value preserved, submit explains        |
| Avatar        | skeleton circle           | initials on `elevated`        | n/a                         | n/a                                  | n/a (non-interactive)                      | n/a                                      | cached or initials, never blank gap     |
| UserCard      | skeleton card             | n/a (list owns empty)         | card-level retry            | actions disabled, card intact        | spring lift, no jitter                     | bio 3 lines + ellipsis                   | cached data + stale badge               |
| PhotoGrid     | progressive placeholders  | "add photo" tile              | per-photo retry             | n/a                                  | opacity only                               | 6 max enforced with counter              | queued uploads listed with state        |
| MessageBubble | optimistic "sending" tick | n/a                           | red tick + tap-to-retry     | n/a                                  | n/a                                        | wraps, no horizontal scroll              | outbox pattern, never silently lost     |
| ChatInput     | n/a                       | hint + send disabled on empty | send failure → draft kept   | send disabled when empty/blocked     | send scales 0.95                           | grows to 4 lines                         | draft preserved, queued visibly         |
| RequestCard   | skeleton row              | n/a (list owns empty)         | inline retry                | buttons disabled while acting        | opacity                                    | names truncate, status chip fixed        | action disabled with reason             |
| Badge/Chip    | n/a                       | n/a                           | n/a                         | `faint` variant                      | chips toggle with announced state          | truncates                                | n/a                                     |
| Modal/Sheet   | n/a                       | n/a                           | n/a                         | n/a                                  | scrim tap dismisses (non-destructive only) | content scrolls inside, CTA pinned       | works offline if content is local       |
| Toast         | n/a                       | n/a                           | n/a                         | n/a                                  | tap to dismiss                             | 2 lines max                              | queued until visible                    |
