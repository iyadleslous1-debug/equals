/**
 * Compatibility RPC probes (local dev ONLY).
 *
 * `get_compatibility(uuid[])` scores the caller's completed survey against
 * completed target surveys and returns ONLY (user_id, score) — raw answers
 * must never leave the database (survey RLS is own-row).
 *
 * Fixtures (hand-computed, see migration header for weights):
 *  - dev-01 vs dev-02 identical answers → 100.
 *  - dev-01 vs dev-03 partial-overlap answers → 68.
 *  - dev-04 (no survey) → no row, never an error.
 *  - anonymous call → rejected.
 *
 * Usage (same shell where you seeded):
 *   $env:SUPABASE_URL = "http://127.0.0.1:54321"
 *   $env:SUPABASE_SERVICE_ROLE_KEY = "<sb_secret_... from `supabase start`>"
 *   $env:SUPABASE_ANON_KEY = "<sb_publishable_... from `supabase start`>"
 *   node scripts/verify-compatibility.mjs
 */
const URL = process.env.SUPABASE_URL ?? '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? '';

if (URL === '' || SERVICE_KEY === '' || ANON_KEY === '') {
  console.error('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_ANON_KEY first.');
  process.exit(2);
}
if (/prod/i.test(URL)) {
  console.error('Refusing to probe what looks like production. Aborting.');
  process.exit(2);
}

const { createClient } = await import('@supabase/supabase-js');
const admin = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });
const asUser = (token) =>
  createClient(URL, ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

let failures = 0;
const verdict = (name, pass, detail) => {
  if (!pass) failures += 1;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const base = {
  hobbies: ['music', 'travel'],
  vibe: 'cafes',
  rhythm: 3,
  sports: 'never',
  cooking: 'sometimes',
  travel: 'essential',
  family: 4,
  career: 2,
  kids: 'no',
  smoking: 'no',
};
// Partial-overlap variant: hobbies [music, sports], vibe homebody, rhythm 5 → 68.
const partial = {
  ...base,
  hobbies: ['music', 'sports'],
  vibe: 'homebody',
  rhythm: 5,
};

const { data: users } = await admin.auth.admin.listUsers();
const byEmail = Object.fromEntries((users?.users ?? []).map((u) => [u.email, u.id]));
for (const n of [1, 2, 3, 4]) {
  if (!byEmail[`dev-0${n}@seed.local`]) {
    console.error('FAIL  setup — seed users missing. Run `npm run seed:dev` first.');
    process.exit(2);
  }
}
const profileIdOf = async (userId) => {
  const { data } = await admin.from('profiles').select('id').eq('user_id', userId).single();
  return data.id;
};
const p1 = await profileIdOf(byEmail['dev-01@seed.local']);
const p2 = await profileIdOf(byEmail['dev-02@seed.local']);
const p3 = await profileIdOf(byEmail['dev-03@seed.local']);
const p4 = await profileIdOf(byEmail['dev-04@seed.local']);

const stamp = new Date().toISOString();
// Snapshot seed rows first: fixtures overwrite them and are restored at the
// end, so the dev DB keeps its surveys after a probe run.
const { data: seedRows } = await admin
  .from('personality_surveys')
  .select('profile_id, answers, completed_at')
  .in('profile_id', [p1, p2, p3]);
await admin.from('personality_surveys').upsert([
  { profile_id: p1, answers: base, completed_at: stamp },
  { profile_id: p2, answers: base, completed_at: stamp },
  { profile_id: p3, answers: partial, completed_at: stamp },
]);
await admin.from('personality_surveys').delete().eq('profile_id', p4);

const login = async (email) => {
  const tmp = createClient(URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await tmp.auth.signInWithPassword({ email, password: 'Seedpass123!' });
  if (error || !data.session) throw new Error(`login ${email}: ${error?.message}`);
  return data.session.access_token;
};

const viewer = asUser(await login('dev-01@seed.local'));
const u2 = byEmail['dev-02@seed.local'];
const u3 = byEmail['dev-03@seed.local'];
const u4 = byEmail['dev-04@seed.local'];
const { data: scores, error } = await viewer.rpc('get_compatibility', { p_user_ids: [u2, u3, u4] });
verdict('probe 1: rpc succeeds', !error, error?.message);
if (!error) {
  const byId = Object.fromEntries(scores.map((r) => [r.user_id, r.score]));
  verdict('probe 2: identical answers score 100', byId[u2] === 100, `got ${byId[u2]}`);
  verdict('probe 3: partial-overlap answers score 68', byId[u3] === 68, `got ${byId[u3]}`);
  verdict('probe 4: missing survey yields no row (no penalty, no error)', !(u4 in byId));
  const leaked = scores.some((r) => 'answers' in r);
  verdict('probe 5: raw answers never leave the database', !leaked);
  const keys = new Set(scores.flatMap((r) => Object.keys(r)));
  verdict(
    'probe 6: output is exactly (user_id, score)',
    keys.size === 2 && keys.has('user_id') && keys.has('score'),
    [...keys].join(','),
  );
}

{
  const anon = createClient(URL, ANON_KEY, { auth: { persistSession: false } });
  const { error: anonError } = await anon.rpc('get_compatibility', { p_user_ids: [u2] });
  verdict('probe 7: anonymous calls rejected', anonError !== null, anonError?.message ?? 'unexpectedly allowed');
}

await admin.from('personality_surveys').delete().eq('profile_id', p4);
for (const row of seedRows ?? []) {
  await admin.from('personality_surveys').upsert(row);
}

if (failures > 0) {
  console.error(`${failures} probe(s) FAILED`);
  process.exit(1);
}
console.log('ALL COMPATIBILITY PROBES PASSED');
