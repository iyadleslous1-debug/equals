# `features/chat` — conversation list + realtime threads

Owns: conversation list, message threads, outbox, read receipts.

- Counterpart display data comes from `get_conversation_previews()` (definer
  fn, one query — no N+1, no client joins RLS would empty).
- Threads: initial fetch + `postgres_changes` append (dedup by id) with
  foreground-refetch safety net. Realtime honors table RLS per subscriber
  (probed: participants receive, outsiders silent).
- Outbox (`useOutbox`): pending → sent/failed with visible tap-to-retry.
  Failed entries keep their draft text; nothing is silently lost.
- Locked conversations (block either way, server trigger): input replaced by
  a lock notice, send disabled with reason.
- Query keys: `['chat', 'list']`, `['chat', 'thread', id]`. Sends invalidate
  both (list order/preview + thread).
- Copy: English, plain and direct.
