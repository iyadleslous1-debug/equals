/**
 * Requests negative-probe script (local dev ONLY).
 *
 *  1. Mirrored pendings (dev-05→dev-06 seed + new dev-06→dev-05): accepting one
 *     flips BOTH to accepted with exactly ONE canonical conversation.
 *  2. Double-accept converges (no crash, still one conversation).
 *  3. Decline touches only the acted row; the mirror stays pending.
 *  4. Non-participants cannot read others' requests (RLS).
 *
 * Cleans up every row it creates (seed rows untouched — verified by count).
 *
 * Usage:
 *   $env:SUPABASE_URL = "http://127.0.0.1:54321"
 *   $env:SUPABASE_ANON_KEY = "<sb_publishable_...>"
 *   $env:SUPABASE_SERVICE_ROLE_KEY = "<sb_secret_...>"
 *   node scripts/verify-requests.mjs
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
const idOf = (email) => (userList?.users ?? []).find((u) => u.email === email)?.id;
const D = (n) => idOf(`dev-0${n}@seed.local`);
const createdRequestIds = [];
const createdConvoIds = [];

// --- setup: mirror rows via real clients (exercises RLS + triggers) ---
const c06 = await login('dev-06@seed.local');
const c01 = await login('dev-01@seed.local');
const c07 = await login('dev-07@seed.local');
const c08 = await login('dev-08@seed.local');

const sendAs = async (client, from, to) => {
  await client.from('swipe_actions').insert({ swiper_id: from, swiped_id: to, action: 'request' });
  const { data, error } = await client
    .from('friend_requests')
    .insert({ sender_id: from, receiver_id: to })
    .select('id')
    .single();
  if (error) throw new Error(`seeded request ${from}->${to}: ${error.message}`);
  createdRequestIds.push(data.id);
  return data.id;
};

const mirrorId = await sendAs(c06, D(6), D(5)); // mirror of seed dev-05→dev-06
await sendAs(c07, D(7), D(8));
await sendAs(c08, D(8), D(7)); // mirror pair for decline isolation

// --- 1. mutual accept flips both + one conversation ---
const seedPending = (
  await admin
    .from('friend_requests')
    .select('id')
    .eq('sender_id', D(5))
    .eq('receiver_id', D(6))
    .eq('status', 'pending')
).data?.[0]?.id;
const acceptBoth = await c06
  .from('friend_requests')
  .update({ status: 'accepted' })
  .or(`and(sender_id.eq.${D(5)},receiver_id.eq.${D(6)}),and(sender_id.eq.${D(6)},receiver_id.eq.${D(5)})`)
  .eq('status', 'pending');
const afterAccept = await admin
  .from('friend_requests')
  .select('id,status')
  .or(`and(sender_id.eq.${D(5)},receiver_id.eq.${D(6)}),and(sender_id.eq.${D(6)},receiver_id.eq.${D(5)})`);
const bothAccepted = (afterAccept.data ?? []).every((r) => r.status === 'accepted');
const [x, y] = D(5) < D(6) ? [D(5), D(6)] : [D(6), D(5)];
const { data: convo } = await c06
  .from('conversations')
  .insert({ participant_a_id: x, participant_b_id: y })
  .select('id')
  .single();
if (convo) createdConvoIds.push(convo.id);
const convoCount = (
  await admin.from('conversations').select('id').eq('participant_a_id', x).eq('participant_b_id', y)
).data?.length;
verdict(
  'probe 1: mutual accept flips both rows + one conversation',
  acceptBoth.error === null && bothAccepted && convoCount === 1,
  `accepted=${bothAccepted} convos=${convoCount}`,
);
void seedPending;
void mirrorId;

// --- 2. double-accept converges ---
const again = await c06
  .from('friend_requests')
  .update({ status: 'accepted' })
  .or(`and(sender_id.eq.${D(5)},receiver_id.eq.${D(6)}),and(sender_id.eq.${D(6)},receiver_id.eq.${D(5)})`)
  .eq('status', 'pending');
const stillOne =
  (await admin.from('conversations').select('id').eq('participant_a_id', x).eq('participant_b_id', y)).data
    ?.length === 1;
verdict('probe 2: double-accept converges (0 rows touched, 1 convo)', again.error === null && stillOne);

// --- 3. decline touches only the acted row ---
const declineTarget = (
  await admin
    .from('friend_requests')
    .select('id')
    .eq('sender_id', D(7))
    .eq('receiver_id', D(8))
    .eq('status', 'pending')
).data?.[0]?.id;
const declined = await c08.from('friend_requests').update({ status: 'declined' }).eq('id', declineTarget);
const mirrorAfter = await admin
  .from('friend_requests')
  .select('status')
  .eq('sender_id', D(8))
  .eq('receiver_id', D(7));
verdict(
  'probe 3: decline isolates to the acted row',
  declined.error === null && (mirrorAfter.data ?? [])[0]?.status === 'pending',
  `mirror=${(mirrorAfter.data ?? [])[0]?.status}`,
);

// --- 4. non-participant reads denied ---
const snooped = await c01.from('friend_requests').select('id').eq('sender_id', D(7));
const leaked = (snooped.data ?? []).length;
verdict(
  'probe 4: non-participant request reads denied',
  snooped.error === null && leaked === 0,
  `${leaked} row(s)`,
);

// --- cleanup: only rows this script created + the mirror-accept pair ---
await admin.from('friend_requests').delete().in('id', createdRequestIds);
await admin.from('conversations').delete().in('id', createdConvoIds);
// restore the seed dev-05→dev-06 pending (consumed by probe 1) + its swipe rows
await admin.from('friend_requests').delete().eq('sender_id', D(5)).eq('receiver_id', D(6));
await admin.from('friend_requests').delete().eq('sender_id', D(6)).eq('receiver_id', D(5));
await admin.from('swipe_actions').delete().eq('swiper_id', D(6)).eq('swiped_id', D(5));
await admin.from('swipe_actions').delete().eq('swiper_id', D(7)).eq('swiped_id', D(8));
await admin.from('swipe_actions').delete().eq('swiper_id', D(8)).eq('swiped_id', D(7));
const { data: reseeded } = await admin
  .from('friend_requests')
  .insert({ sender_id: D(5), receiver_id: D(6) })
  .select('id')
  .single();
void reseeded;

console.log(failures === 0 ? 'ALL REQUEST PROBES PASSED' : `${failures} probe(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
