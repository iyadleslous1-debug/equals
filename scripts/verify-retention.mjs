/**
 * Retention-backend probes (local dev ONLY).
 *
 * record_login(): 1. first call creates streak 1/1.
 *   2. same-day repeat is a no-op (still 1/1).
 *   3. yesterday → increments (backdate via admin, expect 2).
 *   4. 5 days ago → resets to 1, longest preserved.
 *   5. anonymous calls rejected.
 * touch_activity(): 6. stamps last_active_at; immediate repeat keeps the
 *   first stamp (5-minute throttle); anon is a silent no-op.
 * user_stats RLS: 7. dev-02 cannot select dev-01's row; 8. direct client
 *   writes (update) are denied.
 *
 * Usage (same shell where you seeded):
 *   $env:SUPABASE_URL = "http://127.0.0.1:54321"
 *   $env:SUPABASE_SERVICE_ROLE_KEY = "<sb_secret_... from `supabase start`>"
 *   $env:SUPABASE_ANON_KEY = "<sb_publishable_... from `supabase start`>"
 *   node scripts/verify-retention.mjs
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
const u1 = byEmail['dev-01@seed.local'];
await admin.from('user_stats').delete().eq('user_id', u1);

const login = async (email) => {
  const tmp = createClient(URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await tmp.auth.signInWithPassword({ email, password: 'Seedpass123!' });
  if (error || !data.session) throw new Error(`login ${email}: ${error?.message}`);
  return data.session.access_token;
};

const me = asUser(await login('dev-01@seed.local'));
const day = (offset) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

let r = await me.rpc('record_login');
verdict(
  'probe 1: first login starts streak 1/1',
  !r.error && r.data[0]?.current_streak === 1 && r.data[0]?.longest_streak === 1,
  r.error?.message ?? JSON.stringify(r.data?.[0]),
);

r = await me.rpc('record_login');
verdict('probe 2: same-day repeat is a no-op', !r.error && r.data[0]?.current_streak === 1, r.error?.message);

await admin.from('user_stats').update({ last_login_date: day(-1), current_streak: 4, longest_streak: 9 }).eq('user_id', u1);
r = await me.rpc('record_login');
verdict(
  'probe 3: yesterday increments, longest preserved',
  !r.error && r.data[0]?.current_streak === 5 && r.data[0]?.longest_streak === 9,
  r.error?.message ?? JSON.stringify(r.data?.[0]),
);

await admin.from('user_stats').update({ last_login_date: day(-5), current_streak: 5, longest_streak: 9 }).eq('user_id', u1);
r = await me.rpc('record_login');
verdict(
  'probe 4: gap resets to 1, longest kept',
  !r.error && r.data[0]?.current_streak === 1 && r.data[0]?.longest_streak === 9,
  r.error?.message ?? JSON.stringify(r.data?.[0]),
);

{
  const anon = createClient(URL, ANON_KEY, { auth: { persistSession: false } });
  const { error } = await anon.rpc('record_login');
  verdict('probe 5: anonymous record_login rejected', error !== null, error?.message ?? 'unexpectedly allowed');
}

const stamp = async () => {
  const { data } = await admin.from('users').select('last_active_at').eq('id', u1).single();
  return data?.last_active_at ?? null;
};
await admin.from('users').update({ last_active_at: null }).eq('id', u1);
await me.rpc('touch_activity');
const first = await stamp();
await me.rpc('touch_activity');
const second = await stamp();
verdict('probe 6: heartbeat stamps once per 5 minutes', first !== null && first === second, `${first} vs ${second}`);

{
  const other = asUser(await login('dev-02@seed.local'));
  const { data, error } = await other.from('user_stats').select('user_id').eq('user_id', u1);
  verdict('probe 7: cross-user stats read denied', !error && data.length === 0, error?.message ?? `${data.length} rows`);
  const denied = await other.from('user_stats').update({ current_streak: 999 }).eq('user_id', u1);
  const deniedInsert = await other.from('user_stats').insert({ user_id: u1, current_streak: 999 });
  const deniedDelete = await other.from('user_stats').delete().eq('user_id', u1);
  const check = await admin.from('user_stats').select('current_streak').eq('user_id', u1).single();
  verdict(
    'probe 8: direct client writes denied (update/insert/delete)',
    check.data?.current_streak === 1,
    denied.error?.message ?? deniedInsert.error?.message ?? deniedDelete.error?.message,
  );
  // Presence forgery: even my OWN direct last_active_at write is forced
  // back (only touch_activity stamps it). Uses dev-01: cross-user writes
  // die in RLS before any trigger, which would prove nothing.
  const forged = await me.from('users').update({ last_active_at: '2030-01-01T00:00:00Z' }).eq('id', u1);
  const stampCheck = await admin.from('users').select('last_active_at').eq('id', u1).single();
  verdict(
    'probe 9: direct last_active_at writes forced back',
    !forged.error && stampCheck.data?.last_active_at !== '2030-01-01T00:00:00Z',
    forged.error?.message ?? stampCheck.data?.last_active_at,
  );
}

await admin.from('user_stats').delete().eq('user_id', u1);
await admin.from('users').update({ last_active_at: null }).eq('id', u1);

if (failures > 0) {
  console.error(`${failures} probe(s) FAILED`);
  process.exit(1);
}
console.log('ALL RETENTION PROBES PASSED');
