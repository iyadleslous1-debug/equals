# UX Guidelines — DZ Connect

## The four states (every screen, no exceptions)

- **Loading:** skeleton matching content shape (never blank, never bare spinner
  on first paint). Minimum display 300ms to avoid flicker; no maximum — lists
  show cached data + spinner after 2s.
- **Empty:** respectful illustration-free panel — title, one-line reason, one
  action. Never a blank screen or infinite loader. Examples: "No more profiles
  right now — check back later" + Refresh; "No messages yet" + safety note.
- **Error:** human sentence + what-to-do + retry action. Never raw messages,
  never silent failure. Network errors name the cause ("No connection").
- **Success:** inline confirmation (check + label) or Toast; destructive or
  safety actions always confirm _before_ (see below).

## Forms

Validate on blur, confirm on submit. Inline error under each field, linked via
`accessibilityDescribedBy`; failed submit focuses an error summary listing
each field as a link. Countdowns (OTP resend) show seconds + reason, not a
mystery-disabled button. Auth allows paste + password managers.

## Trust & safety UX

- Report/block reachable within one tap from any stranger surface.
- Confirmations for irreversible-or-sensitive acts (block, report, decline):
  plain-language consequence, explicit confirm, visible undo window where the
  server allows it (block = instant; report = immutable, say so).
- Pending-moderation content shows "under review" to its owner.

## Offline & lifecycle

- Airplane mode mid-action: mutation queues visibly (outbox) or explains;
  nothing is silently lost. Drafts (chat input, onboarding) survive
  backgrounding and restarts.
- Foreground return refetches realtime-sensitive lists (requests, chat).
- First-time vs returning: onboarding resumes mid-wizard; authed users land
  on Discover, never on auth.

## Conservative-market copy

French-simple default (D1). Short sentences, no idioms, no suggestive copy,
no gendered assumptions, wilaya as "Wilaya 16 — Alger" (never bare codes,
never maps/distances).
