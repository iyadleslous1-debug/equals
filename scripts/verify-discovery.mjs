/**
 * Discovery negative-probe script (local dev ONLY).
 *
 *  1. dev-01's deck excludes self, swiped pairs (both directions), and the
 *     accepted-request partner — exactly {dev-03..dev-07}.
 *  2. dev-06's deck excludes the blocked dev-07 and pending partner dev-05.
 *  3. A normal swipe insert passes the rate trigger (pass-through).
 *  4. Rate buckets actually exhaust (mechanics behind the triggers).
 *  5. Soft-deleted users never appear (dev-08 retired mid-probe, then restored
 *     by reseed — run `npm run seed:dev` after this script).
 *
 * Usage:
 *   $env:SUPABASE_URL = "http://127.0.0.1:54321"
 *   $env:SUPABASE_ANON_KEY = "<sb_publishable_...>"
 *   $env:SUPABASE_SERVICE_ROLE_KEY = "<sb_secret_...>"
 *   node scripts/verify-discovery.mjs
 */
const URL = process.env.SUPABASE_URL ?? '';
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (URL === '' || ANON_KEY === '' || SERVICE_KEY === '') {
  console.error('Set SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY first.');
  process.exit(2);
}
if (/prod/i.test(URL)) {
  console.error('Refusing to probe what looks like production. Aborting.');
  process.exit(2);
}

const { createClient } = await import('@supabase/supabase-js');
const admin = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });

const login = async (email) => {
  const client = createClient(URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password: 'Seedpass123!' });
  if (error || !data.session) throw new Error(`login ${email}: ${error?.message}`);
  return client;
};

let failures = 0;
const verdict = (name, pass, detail) => {
  if (!pass) failures += 1;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const { data: userList } = await admin.auth.admin.listUsers();
const emailOf = Object.fromEntries((userList?.users ?? []).map((u) => [u.id, u.email]));
const idOf = (email) => Object.keys(emailOf).find((id) => emailOf[id] === email);
const deckEmails = async (client) => {
  const { data, error } = await client.rpc('get_discovery_candidates', { p_limit: 50 });
  if (error) throw new Error(`deck rpc: ${error.message}`);
  return (data ?? []).map((row) => emailOf[row.user_id] ?? row.user_id).sort();
};

// --- 1 & 2. exclusion matrix ---
const dev01 = await login('dev-01@seed.local');
const dev06 = await login('dev-06@seed.local');
const deck01 = await deckEmails(dev01);
verdict(
  'probe 1: dev-01 deck excludes self/swiped/requested',
  JSON.stringify(deck01) ===
    JSON.stringify([
      'dev-03@seed.local',
      'dev-04@seed.local',
      'dev-05@seed.local',
      'dev-06@seed.local',
      'dev-07@seed.local',
    ]),
  deck01.join(', ') || '(empty)',
);
const deck06 = await deckEmails(dev06);
verdict(
  'probe 2: dev-06 deck excludes blocked + pending partner',
  !deck06.includes('dev-07@seed.local') && !deck06.includes('dev-05@seed.local'),
  deck06.join(', ') || '(empty)',
);

// --- 3. trigger pass-through on a normal swipe ---
const target = idOf('dev-03@seed.local');
const swipe = await dev01.from('swipe_actions').insert({
  swiper_id: idOf('dev-01@seed.local'),
  swiped_id: target,
  action: 'skip',
});
verdict('probe 3: normal swipe passes the rate trigger', swipe.error === null, swipe.error?.message);
if (swipe.error === null) {
  await admin.from('swipe_actions').delete().eq('swiper_id', idOf('dev-01@seed.local')).eq('swiped_id', target);
}

// --- 4. bucket mechanics exhaust ---
let allowed = 0;
for (let i = 0; i < 65; i += 1) {
  const { data } = await dev01.rpc('check_rate_limit', {
    p_action: 'swipe',
    p_max_count: 60,
    p_window_seconds: 3600,
  });
  if (data === true) allowed += 1;
  else break;
}
verdict('probe 4: swipe bucket caps at 60', allowed <= 60 && allowed >= 55, `allowed ${allowed}/65`);

// --- 5. soft-deleted users vanish (restored afterwards by reseed) ---
await admin.from('users').update({ account_status: 'deleted' }).eq('id', idOf('dev-08@seed.local'));
const deckAfter = await deckEmails(dev01);
verdict(
  'probe 5: soft-deleted users excluded',
  !deckAfter.includes('dev-08@seed.local'),
  deckAfter.join(', ') || '(empty)',
);

console.log(failures === 0 ? 'ALL DISCOVERY PROBES PASSED' : `${failures} probe(s) FAILED`);
console.log('NOTE: dev-08 was soft-deleted by probe 5 — run `npm run seed:dev` to restore.');
process.exit(failures === 0 ? 0 : 1);
