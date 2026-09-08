# Animation Guidelines — DZ Connect

Tier: **subtle**. The app should feel alive, not like a demo.

## Tokens (`ANIMATION.duration`)

- `fast` 150ms — pressed feedback, fades, toast in/out.
- `base` 200ms — sheet/modal transitions, card actions, tab switches.
- `slow` 300ms — screen-level transitions, skeleton shimmer cycle.
- One spring preset for swipe-card gestures (tension/friction shared, never
  per-screen tuned).

## Rules

1. Pressed feedback (opacity/elevation) lands within 80–150ms and never moves
   layout bounds (no jitter).
2. Enter faster than exit is wrong here — keep symmetric simple fades; no
   choreography, no stagger cascades, no scroll-linked effects in MVP1.
3. `prefers-reduced-motion` (OS setting): all motion collapses to static
   end-states. Verify per screen — a screen that breaks without animation is
   a bug.
4. Keyboard transitions use the OS curve (KeyboardAvoidingView behavior, not
   custom animation).
5. Haptics pair with motion sparingly: light press on primary actions,
   success on sent/accepted, error on destructive confirm. Never on scroll,
   typing, polling, or countdowns.

## Per-screen audit (visual QA loop)

Screenshot on device → list top-3 motion problems specifically ("send button
scales layout on press" not "animation feels off") → fix one → recheck.
