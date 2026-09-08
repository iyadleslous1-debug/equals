/**
 * RLS negative-probe script (local dev ONLY).
 *
 * Attacks the seeded database as a low-privilege user and expects the
 * database to reject each attack:
 *  1. dev-01 reads messages from dev-03/dev-04's conversation → must see 0 rows.
 *  2. dev-06 (receiver of the pending dev-05→dev-06 request) accepts it twice →
 *     first accept succeeds, second must be rejected by guard_request_transition().
 *
 * Usage (same shell where you seeded):
 *   $env:SUPABASE_URL = "http://127.0.0.1:54321"
 *   $env:SUPABASE_SERVICE_ROLE_KEY = "<sb_secret_... from `supabase start`>"
 *   $env:SUPABASE_ANON_KEY = "<sb_publishable_... from `supabase start`>"
 *   node scripts/verify-rls.mjs
 *
 * One-shot: probe 2 mutates the pending request to 'accepted'. Re-run
 * `npm run seed:dev` before running this script again.
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

// --- privileged setup: discover IDs (test harness only, never the attack path) ---
const { data: users } = await admin.auth.admin.listUsers();
const byEmail = Object.fromEntries((users?.users ?? []).map((u) => [u.email, u.id]));
const dev01 = byEmail['dev-01@seed.local'];
const dev06 = byEmail['dev-06@seed.local'];
if (!dev01 || !dev06) {
  console.error('FAIL  setup — seed users missing. Run `npm run seed:dev` first.');
  process.exit(2);
}
const { data: foreignConvo } = await admin
  .from('conversations')
  .select('id')
  .not('participant_a_id', 'in', `(${dev01})`)
  .not('participant_b_id', 'in', `(${dev01})`)
  .limit(1)
  .single();
const { data: pendingReq } = await admin
  .from('friend_requests')
  .select('id')
  .eq('receiver_id', dev06)
  .eq('status', 'pending')
  .limit(1)
  .single();
if (!foreignConvo || !pendingReq) {
  console.error(
    'FAIL  setup — no foreign conversation or no pending request found. Re-run `npm run seed:dev`.',
  );
  process.exit(2);
}

// --- log in as low-privilege users ---
const login = async (email) => {
  const tmp = createClient(URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await tmp.auth.signInWithPassword({ email, password: 'Seedpass123!' });
  if (error || !data.session) throw new Error(`login ${email}: ${error?.message}`);
  return data.session.access_token;
};

// PROBE 1: dev-01 reads someone else's private messages → must see nothing.
{
  const attacker = asUser(await login('dev-01@seed.local'));
  const { data, error } = await attacker.from('messages').select('id').eq('conversation_id', foreignConvo.id);
  if (error) verdict('probe 1: cross-user message read denied', false, `unexpected error: ${error.message}`);
  else verdict('probe 1: cross-user message read denied', data.length === 0, `${data.length} row(s) visible`);
}

// PROBE 2: double-accept of one friend request → second must fail.
{
  const receiver = asUser(await login('dev-06@seed.local'));
  const first = await receiver.from('friend_requests').update({ status: 'accepted' }).eq('id', pendingReq.id);
  verdict('probe 2a: first accept succeeds', !first.error, first.error?.message);
  const second = await receiver
    .from('friend_requests')
    .update({ status: 'accepted' })
    .eq('id', pendingReq.id);
  verdict(
    'probe 2b: second accept rejected',
    !!second.error,
    second.error ? `rejected: ${second.error.message}` : 'ACCEPTED TWICE — state machine broken',
  );
}

console.log(failures === 0 ? 'ALL RLS PROBES PASSED' : `${failures} probe(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
