# `features/requests` — inbox, mutual accept, decline

Owns: received/sent lists, accept/decline actions, `RequestCard`.

- Counterpart display data comes from `get_request_inbox()` (definer fn) —
  `profiles` RLS is owner-only, so no client-side join is possible.
- **Mutual accept (decision (a)):** one accept flips every pending row in BOTH
  directions, then gets-or-creates the canonical (`a<b`) conversation.
  Double-accepts converge (trigger guards + idempotent lookup). Decline is
  personal: only the acted row flips.
- Mirrored pendings are distinct rows by design (`friend_requests_pending_idx`
  covers same-direction only) — reconciled here, never in the deck.
- Query keys: `['requests']`. Mutations invalidate it.
- Copy: French-simple (D1).
