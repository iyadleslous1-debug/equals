# `features/safety` — reports + blocks

Owns: report/block/unblock actions, `ReportSheet`, `BlockConfirm`.

- Reports are **insert-only by RLS** (no UPDATE/DELETE policies exist) — the
  UI states immutability before confirm, and no code path can alter one.
- Blocks are blocker-scoped (insert/select/delete own). Double-block is
  idempotent success (UNIQUE pair). Unblock reverses fully.
- Block success busts **all** React Query caches (blanket invalidate — deck,
  requests and chat must drop the party at once; importing other features'
  query keys would break the no-cross-import rule).
- Moderation queue (reviewing/actioned) is service_role tooling, not app UI.
- Copy: English, plain and direct. Safety copy is explicit about consequences and
  irreversibility — never a bare icon tap.
