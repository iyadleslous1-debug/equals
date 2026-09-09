/**
 * Discovery-filter probes (local dev ONLY).
 *
 * Filter params on `get_discovery_candidates` narrow the pool — they must
 * never bypass the deck exclusions (self/swipes/blocks/inactive/photos):
 *  1. age range narrows (all rows within range).
 *  2. wilaya multi-select narrows (all rows in the set).
 *  3. sort=newest returns created_at descending.
 *  4. blocked users stay excluded even with wide-open filters.
 *  5. invalid sort falls back to default (random, still succeeds).
 *
 * Seed ages/wilayas (dev-01 excluded as self): dev-02/24/31, dev-03/27/25,
 * dev-04/30/19, dev-05/22/23, dev-06/35/9, dev-07/29/6, dev-08/26/16.
 * NOTE: seed swipes/blocks/requests remove several candidates, so probes
 * assert properties of returned rows (not exact counts), plus one
 * exclusion case that must hold regardless.
 *
 * Usage (same shell where you seeded):
 *   $env:SUPABASE_URL = "http://127.0.0.1:54321"
 *   $env:SUPABASE_SERVICE_ROLE_KEY = "<sb_secret_... from `supabase start`>"
 *   $env:SUPABASE_ANON_KEY = "<sb_publishable_... from `supabase start`>"
 *   node scripts/verify-filters.mjs
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

const viewer = asUser(await login('dev-01@seed.local'));
const deck = async (params) => {
  const { data, error } = await viewer.rpc('get_discovery_candidates', { p_limit: 20, ...params });
  return { data: data ?? [], error };
};

// PROBE 1: age range narrows.
{
  const { data, error } = await deck({ p_age_min: 26, p_age_max: 30 });
  const inRange = data.every((r) => r.age >= 26 && r.age <= 30);
  verdict('probe 1: age range narrows', !error && data.length > 0 && inRange, error?.message ?? `${data.length} row(s)`);
}

// PROBE 2: wilaya multi-select narrows.
{
  const { data, error } = await deck({ p_wilayas: [31, 25] });
  const inSet = data.every((r) => [31, 25].includes(r.wilaya));
  verdict('probe 2: wilaya set narrows', !error && data.length > 0 && inSet, error?.message ?? `${data.length} row(s)`);
}

// PROBE 3: newest sort orders by recency.
{
  const { data, error } = await viewer.rpc('get_discovery_candidates', {
    p_limit: 20,
    p_sort: 'newest',
  });
  // created_at is not in the deck output; re-fetch order via admin by user_id.
  const ids = (data ?? []).map((r) => r.user_id);
  const { data: rows } = await admin.from('profiles').select('user_id, created_at').in('user_id', ids);
  const byId = Object.fromEntries(rows.map((r) => [r.user_id, r.created_at]));
  const ordered = ids.every((id, i) => i === 0 || byId[ids[i - 1]] >= byId[id]);
  verdict('probe 3: newest sort is recency-ordered', !error && ids.length > 1 && ordered, error?.message);
}

// PROBE 4: blocks hold with wide-open filters (dev-01 blocked nobody… dev-06
// blocked dev-07, so dev-06 must never see dev-07).
{
  const blocked = asUser(await login('dev-06@seed.local'));
  const { data, error } = await blocked.rpc('get_discovery_candidates', {
    p_limit: 20,
    p_age_min: 18,
    p_age_max: 100,
  });
  const { data: u7 } = await admin.auth.admin.listUsers();
  const id7 = u7.users.find((u) => u.email === 'dev-07@seed.local').id;
  const leaked = (data ?? []).some((r) => r.user_id === id7);
  verdict('probe 4: blocks hold under filters', !error && !leaked, error?.message);
}

// PROBE 5: unknown sort falls back instead of erroring.
{
  const { error } = await deck({ p_sort: 'mystery' });
  verdict('probe 5: unknown sort falls back', !error, error?.message);
}

if (failures > 0) {
  console.error(`${failures} probe(s) FAILED`);
  process.exit(1);
}
console.log('ALL FILTER PROBES PASSED');
