# Contributing — DZ Connect (MVP0 foundation)

Solo-friendly conventions so future-you (or a team) never has to reverse-engineer
the project. CI enforces the mechanical parts on every push.

## Naming

| Thing               | Convention                                       | Example                              |
| ------------------- | ------------------------------------------------ | ------------------------------------ |
| Files (code)        | `camelCase.ts` / `PascalCase.tsx` for components | `otp-throttle.ts`, `ProfileCard.tsx` |
| Folders             | lowercase, singular                              | `features/discover`, `hooks/`        |
| Functions/variables | `camelCase`                                      | `signInWithOtp`                      |
| Types/interfaces    | `PascalCase`                                     | `ApiResult`, `EnvConfig`             |
| Constants           | `SCREAMING_SNAKE` for true constants             | `OTP_LIMITS`                         |
| DB tables/columns   | `snake_case`                                     | `friend_requests`, `created_at`      |
| Migrations          | `<UTC-timestamp>_short-slug.sql`                 | `20260908000000_mvp0_core.sql`       |

## Folder rules

- `app/` — Expo Router routes only. No business logic in route files; they
  compose from `features/` + `components/`.
- `components/` — shared, prop-driven UI. No Supabase / React Query imports.
- `features/<name>/` — `api.ts` (Supabase → `ApiResult`), `hooks/`,
  `components/`, `store.ts`, `README.md`. Features never import each other.
- `lib/` — cross-cutting infra (`supabase`, `auth`, `result`, `logger`,
  `config`). No UI imports.
- `types/database.ts` — generated, never hand-edited (see below).
- `supabase/migrations/` — append-only. Never edit a pushed migration; write a
  new one.

## Commits

Conventional Commits: `<type>(<scope>): <subject>` — e.g.
`feat(auth): add OTP cooldown`, `chore(db): add points ledger migration`.
Types: `feat fix chore docs refactor test ci`.

## Adding a table / migration (the only supported way)

1. `npm run db:new my-change` (or `supabase migration new my-change`).
2. Write idempotent-ish DDL: FKs with explicit `ON DELETE`, indexes for every
   column you filter/join on, CHECKs for enums/ranges.
3. **RLS in the same PR, before merge.** Pattern per table:
   `ENABLE ROW LEVEL SECURITY` + policies for `select/insert/update/delete`
   scoped to `auth.uid()` ownership or explicit sharing. A table without
   policies stays invisible (deny-by-default) — verify with the checklist below.
4. Regenerate types: `npm run gen:types` (requires `supabase link` once).
5. `supabase db reset` locally, then run the app's happy path.
6. RLS checklist (paste into the PR): table, who can SELECT / INSERT / UPDATE /
   DELETE, and one negative case you tested (e.g. "user B cannot read user A's
   pending request").

## Type drift guard

`types/database.ts` is generated from the live schema. If CI's regen diff is
non-empty, the migration and the checked-in types disagree — regenerate and
commit.

## Auth (email now, phone later)

MVP0 uses email + password with Supabase's built-in confirmation (free tier).
`lib/auth/` is split by method — `email.ts` (live), `phone.ts` (fail-closed
stubs), `validation.ts` (shared pure validators), `index.ts` (façade). Feature
code imports only from `@/lib/auth`. When phone/OTP ships: implement the two
stubs with `signInWithOtp`/`verifyOtp`, point delivery at `lib/sms.ts` via the
Custom SMS sender hook — no migration, RLS, or call-site changes required
(`users.phone_number` is already nullable + unique).

Never put aggregator keys in `EXPO_PUBLIC_*` vars (client-visible) — they
belong in edge-function secrets.

## Testing

- Pure logic (`lib/`, `constants/`) gets unit tests in `__tests__/`.
- Supabase-touching code is tested against `supabase start` locally (RLS
  negative cases), not mocked into meaninglessness.
- Keep `npm run test:ci` green: coverage thresholds live in `jest.config.js`.
