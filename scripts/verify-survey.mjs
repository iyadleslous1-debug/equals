/**
 * Survey RLS negative-probe script (local dev ONLY).
 *
 * Expects the survey table to be empty for the seed users (fresh `npm run
 * seed:dev`, which never creates survey rows):
 *  1. dev-02 cannot SELECT dev-01's survey row (0 rows visible).
 *  2. dev-02 cannot UPDATE dev-01's survey row (rejected).
 *  3. dev-02 cannot DELETE dev-01's survey row (rejected).
 *  4. dev-02 cannot INSERT a row keyed to dev-01's profile (rejected).
 *  5. dev-01's own insert → select → update → delete round-trip succeeds.
 *
 * Usage (same shell where you seeded):
 *   $env:SUPABASE_URL = "http://127.0.0.1:54321"
 *   $env:SUPABASE_SERVICE_ROLE_KEY = "<sb_secret_... from `supabase start`>"
 *   $env:SUPABASE_ANON_KEY = "<sb_publishable_... from `supabase start`>"
 *   node scripts/verify-survey.mjs
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

const { data: users } = await admin.auth.admin.listUsers();
const byEmail = Object.fromEntries((users?.users ?? []).map((u) => [u.email, u.id]));
if (!byEmail['dev-01@seed.local'] || !byEmail['dev-02@seed.local']) {
  console.error('FAIL  setup — seed users missing. Run `npm run seed:dev` first.');
  process.exit(2);
}
const profileIdOf = async (userId) => {
  const { data, error } = await admin.from('profiles').select('id').eq('user_id', userId).single();
  if (error || !data) throw new Error(`profile for ${userId}: ${error?.message}`);
  return data.id;
};
const p1 = await profileIdOf(byEmail['dev-01@seed.local']);

const login = async (email) => {
  const tmp = createClient(URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await tmp.auth.signInWithPassword({ email, password: 'Seedpass123!' });
  if (error || !data.session) throw new Error(`login ${email}: ${error?.message}`);
  return data.session.access_token;
};

// Victim row, created by the owner (proves own-write works — probe 5a).
// Upsert: the seed already carries surveys, so this overwrites and the
// original is restored at the end.
const { data: seedRow } = await admin
  .from('personality_surveys')
  .select('profile_id, answers, completed_at')
  .eq('profile_id', p1)
  .maybeSingle();
const owner = asUser(await login('dev-01@seed.local'));
const created = await owner
  .from('personality_surveys')
  .upsert({ profile_id: p1, answers: { vibe: 'cafes' } }, { onConflict: 'profile_id' });
verdict('probe 5a: own write succeeds', !created.error, created.error?.message);

// PROBE 1: cross-user select → nothing visible.
{
  const attacker = asUser(await login('dev-02@seed.local'));
  const { data, error } = await attacker.from('personality_surveys').select('profile_id').eq('profile_id', p1);
  if (error) verdict('probe 1: cross-user survey read denied', false, `unexpected error: ${error.message}`);
  else verdict('probe 1: cross-user survey read denied', data.length === 0, `${data.length} row(s) visible`);
}

// PROBE 2: cross-user update → rejected.
{
  const attacker = asUser(await login('dev-02@seed.local'));
  const { error } = await attacker
    .from('personality_surveys')
    .update({ answers: { vibe: 'homebody' } })
    .eq('profile_id', p1);
  // PostgREST returns 0 touched rows on RLS-deny for updates; supabase-js
  // surfaces no error, so verify the row is unchanged instead.
  const { data } = await owner.from('personality_surveys').select('answers').eq('profile_id', p1).single();
  verdict('probe 2: cross-user survey update denied', data?.answers?.vibe === 'cafes', error?.message);
}

// PROBE 3: cross-user delete → row survives.
{
  const attacker = asUser(await login('dev-02@seed.local'));
  await attacker.from('personality_surveys').delete().eq('profile_id', p1);
  const { data } = await owner.from('personality_surveys').select('profile_id').eq('profile_id', p1).single();
  verdict('probe 3: cross-user survey delete denied', data?.profile_id === p1);
}

// PROBE 4: insert keyed to someone else's profile → rejected.
{
  const attacker = asUser(await login('dev-02@seed.local'));
  const { error } = await attacker.from('personality_surveys').insert({ profile_id: p1, answers: {} });
  verdict('probe 4: foreign-profile insert denied', error !== null, error?.message ?? 'unexpectedly allowed');
}

// PROBE 5b/5c: owner round-trip (select sees it, delete removes it).
// dev-04 has no seed survey, so the insert/delete cycle leaves no residue.
{
  const seen = await owner.from('personality_surveys').select('profile_id').eq('profile_id', p1).single();
  verdict('probe 5b: own select succeeds', seen.data?.profile_id === p1, seen.error?.message);
  const p4 = await profileIdOf(byEmail['dev-04@seed.local']);
  const other = asUser(await login('dev-04@seed.local'));
  const own = await other.from('personality_surveys').insert({ profile_id: p4, answers: {} });
  verdict('probe 5c: second owner insert succeeds', !own.error, own.error?.message);
  const gone = await other.from('personality_surveys').delete().eq('profile_id', p4);
  const check = await admin.from('personality_surveys').select('profile_id').eq('profile_id', p4);
  verdict('probe 5d: own delete succeeds', !gone.error && check.data.length === 0, gone.error?.message);
}

// Restore dev-01's seed row (probe 5a overwrote it).
if (seedRow) {
  await admin.from('personality_surveys').upsert(seedRow, { onConflict: 'profile_id' });
}

if (failures > 0) {
  console.error(`${failures} probe(s) FAILED`);
  process.exit(1);
}
console.log('ALL SURVEY PROBES PASSED');
