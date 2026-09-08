# `components/` — shared presentational UI only

Rules:

- **Dumb by default.** Components receive data + callbacks via props. No Supabase
  imports, no `useQuery`, no navigation side effects.
- One component per file, `PascalCase.tsx`, co-located test as `*.test.tsx` when
  it carries logic.
- Feature-specific UI lives in `features/<name>/components/`, not here. Promote
  to shared only after the **second** reuse.
- Styling via NativeWind classes. No inline `StyleSheet` unless measuring layout.
- Every component gets an explicit props interface (no anonymous object types).
