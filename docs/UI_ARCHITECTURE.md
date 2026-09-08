# UI Architecture — DZ Connect

## Route map (Expo Router, typed routes on)

```
app/
  _layout.tsx          providers only (Query, Session mirror, ErrorBoundary)
  index.tsx            AuthGate: loading → (auth) | (onboarding) | (tabs)
  (auth)/             signup · login · confirm-code · (no data fetching here)
  (onboarding)/       profile wizard (draft persisted, resumable)
  (tabs)/             discover · requests · chat · profile
```

Rules: route files compose from `features/` + `components/` — no Supabase,
no React Query, no business logic in routes (CONTRIBUTING.md). Headers hidden
globally; each screen owns its header (back + title + actions) for consistency.

## State ownership

| Layer                        | Holds                                | Never holds   |
| ---------------------------- | ------------------------------------ | ------------- |
| `store/sessionStore`         | session mirror, tri-state            | server data   |
| `features/<n>/store.ts`      | ephemeral UI (draft, deck index)     | server truth  |
| React Query                  | all server data, keys `['table', …]` | form drafts   |
| SecureStore (via `lib/auth`) | session persistence                  | anything else |

Logout clears the session **and** `queryClient.clear()` — no stale-data flash
for the next user on a shared device.

## Data flow per screen

Screen → feature `hooks/` (React Query) → feature `api.ts` (`ApiResult<T>`,
errors via `toAppError`) → Supabase. UI states map 1:1 to query states:
`isPending` → LoadingState · `isError` → ErrorState+retry · empty data →
EmptyState · offline → cached data + offline banner (NetInfo).

## Navigation decisions

- Gate redirects replace history (no back-to-gate loops).
- Tabs: Discover · Requests (badge) · Chat (unread dot) · Profile.
- Deep-linkable canonical rows only (conversation id, request id) — never
  positional indexes.
