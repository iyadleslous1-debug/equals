# `features/discover` — swipe deck + friend-request sending

Owns: deck fetching, request/skip actions, `UserCard`.

- Deck reads go through `get_discovery_candidates()` (definer fn) — the ONLY
  stranger-read path. Exclusions live in SQL, never in app filters.
  Reverse-swipe exclusion is intentional (history stays hidden, no liked-you
  leaks); inbound interest surfaces in Requests, never in the deck.
- `pending` photos are deck-eligible INTERIM (no moderation tooling yet —
  approved-only would empty every deck). Flip when tooling ships.
- Request = swipe row first (`UNIQUE` pair = double-tap backstop, 23505 maps
  to idempotent success), then the request row. Same-direction double-pending
  is impossible (partial unique); MIRRORED pendings (A→B + B→A) are possible
  and must be reconciled by the Requests piece (Piece 4 requirement).
- Rate triggers decide server-side (`swipe` 60/min, `request_send` 10/hr); denials surface as
  visible throttle states via `mapDbError`.
- `useAct` serializes button taps (frontstop); the UNIQUE constraint is the
  backstop. Buttons-first, no pan gestures in MVP (a11y rule).
- Query keys: `['deck']`. Every action invalidates it.
- Copy: English, plain and direct.
