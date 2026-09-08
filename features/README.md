# `features/` — feature modules (MVP1+)

Each feature is a self-contained folder. Nothing here yet by design (MVP0 is
foundation only). When a feature lands, it follows this anatomy:

```
features/discover/
  components/   # feature-only UI (Card, Filters…)
  hooks/        # useDeck, useSwipe… (React Query lives here)
  store.ts      # feature client state (Zustand), if needed
  api.ts        # Supabase calls returning ApiResult<T> (see lib/result.ts)
  README.md     # what the feature owns + its query keys
```

Rules:

- Features never import from each other — shared code moves to `lib/`,
  `components/`, `hooks/` or `types/`.
- All server I/O goes through React Query with keys starting with the table
  name, e.g. `['profiles', userId]`.
- All fallible calls return `ApiResult<T>`; map errors with `toAppError`.
