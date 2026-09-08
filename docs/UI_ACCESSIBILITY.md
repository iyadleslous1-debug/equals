# UI Accessibility — DZ Connect

Target: every screen usable with screen reader + largest text + reduced
motion. Verified per screen on the Pre-Delivery Checklist (MASTER.md) —
reported pass/fail, never assumed.

## Non-negotiables

- Touch targets ≥44×44pt iOS / ≥48×48dp Android (`HIT_SLOP`); hitSlop on all
  icon-only controls.
- Text contrast ≥4.5:1 on dark surfaces (tokens guarantee this — hardcoded
  colors void the guarantee).
- Form fields labeled with hints; inline errors linked; failed submit moves
  focus to an error summary with per-field links; errors persist until fixed.
- Icon-only buttons have accessible names and announce state
  (selected/pressed/expanded). Decorative icons hidden from the tree.
- Color is never the sole signal (status chips pair color + label/icon).
- Swipe/drag actions always have button alternatives (accept/skip,
  photo reorder).
- Auth: paste allowed, password managers allowed, non-cognitive alternatives
  (no puzzles/CAPTCHAs), OTP field announces countdown politely.

## Device matrix per screen

- 375px small phone (primary) · large phone · tablet portrait/landscape.
- Largest Dynamic Type: no clipped CTA, no overlapping text, scroll where needed.
- Reduced motion on: static end-states, content intact.
- Landscape: gutters 24, content capped at 640, no edge-to-edge paragraphs.

## Review rule

Any PR adding UI states the screen's checklist result: which matrix rows were
checked, on which device sizes, with screen reader on/off. "Looks fine" is
not a result.
