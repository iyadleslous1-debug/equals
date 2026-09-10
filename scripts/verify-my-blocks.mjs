/**
 * My-blocks RPC probes (local dev ONLY).
 *
 * `get_my_blocks()` lists MY blocked users with display names (profile rows
 * stay own-row; the name lookup happens inside the definer):
 *  1. dev-06 (seed-blocked dev-07) sees exactly dev-07 with a name.
 *  2. dev-01 (blocks nobody) sees an empty list.
 *  3. output is exactly (blocked_id, display_name) — no extra columns.
 *  4. anonymous calls rejected.
 *
 * Usage (same shell where you seeded):
 *   $env:SUPABASE_URL = "http://127.0.0.1:54321"
 *   $env:SUPABASE_SERVICE_ROLE_KEY = "<sb_secret_... from `supabase start`>"
 *   $env:SUPABASE_ANON_KEY = "<sb_publishable_... from `supabase start`>"
 *   node scripts/verify-my-blocks.mjs
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

const login = async (email) => {
  const tmp = createClient(URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await tmp.auth.signInWithPassword({ email, password: 'Seedpass123!' });
  if (error || !data.session) throw new Error(`login ${email}: ${error?.message}`);
  return data.session.access_token;
};

{
  const blocker = asUser(await login('dev-06@seed.local'));
  const { data, error } = await blocker.rpc('get_my_blocks');
  const { data: u7 } = await admin.auth.admin.listUsers();
  const id7 = u7.users.find((u) => u.email === 'dev-07@seed.local').id;
  const row = (data ?? []).find((r) => r.blocked_id === id7);
  verdict('probe 1: blocker sees the blocked user', !error && row !== undefined, error?.message);
  verdict(
    'probe 2: row carries a display name',
    typeof row?.display_name === 'string' && row.display_name.length >= 2,
  );
  const keys = new Set((data ?? []).flatMap((r) => Object.keys(r)));
  verdict(
    'probe 3: output is exactly (blocked_id, display_name)',
    keys.size === 2 && keys.has('blocked_id') && keys.has('display_name'),
    [...keys].join(','),
  );
}

{
  const clean = asUser(await login('dev-01@seed.local'));
  const { data, error } = await clean.rpc('get_my_blocks');
  verdict('probe 4: non-blocker sees empty list', !error && data.length === 0, error?.message);
}

{
  const anon = createClient(URL, ANON_KEY, { auth: { persistSession: false } });
  const { error: anonError } = await anon.rpc('get_my_blocks');
  verdict('probe 5: anonymous calls rejected', anonError !== null, anonError?.message ?? 'unexpectedly allowed');
}

if (failures > 0) {
  console.error(`${failures} probe(s) FAILED`);
  process.exit(1);
}
console.log('ALL MY-BLOCKS PROBES PASSED');
