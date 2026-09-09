# `features/auth` — email auth UI + orchestration

Owns: `(auth)` screens, `useSignUp/useLogin/useConfirmCode/useResendCode/
useSignOut` hooks, pending-email persistence, error→UI mapping.

- Server calls live in `api.ts` (thin over `@/lib/auth`, plus pending-email
  side effects). No Supabase imports in screens or components.
- Mutations use local state, not React Query: one-shot auth attempts have no
  caching semantics. Server _data_ elsewhere stays on React Query.
- Query keys: none (no cached server data). Logout purges everything via
  `queryClient.clear()` — shared-device safe.
- Copy: English, plain and direct. Error strings come from `lib/auth` `friendly()`;
  `authErrors.ts` maps the ambiguous `auth/signin-failed` code to next UI
  states in one place (fragile-by-design until server codes split).
