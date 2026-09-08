/**
 * Chat guard + realtime probes (local dev ONLY).
 *
 *  1. Block-lock: dev-03 blocks dev-04 → BOTH directions' inserts rejected
 *     with the locked message; unblock restores sending (row removed after).
 *  2. Realtime delivery: dev-01 subscribes to message inserts; dev-02 sends
 *     in their shared convo → dev-01 receives within seconds.
 *  3. Realtime privacy: dev-03 sends in the OTHER convo → dev-01 must NOT
 *     receive it (RLS-governed publication).
 *  4. Mark-read: dev-02 stamps dev-01's message read_at (participant UPDATE).
 *
 * Usage:
 *   $env:SUPABASE_URL = "http://127.0.0.1:54321"
 *   $env:SUPABASE_ANON_KEY = "<sb_publishable_...>"
 *   $env:SUPABASE_SERVICE_ROLE_KEY = "<sb_secret_...>"
 *   node scripts/verify-chat.mjs
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
  const client = createClient(URL, ANON_KEY, {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 20 } },
  });
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
const convoBetween = async (a, b) => {
  const [x, y] = a < b ? [a, b] : [b, a];
  const { data } = await admin
    .from('conversations')
    .select('id')
    .eq('participant_a_id', x)
    .eq('participant_b_id', y)
    .single();
  return data?.id ?? null;
};

const c1 = await convoBetween(idOf('dev-01@seed.local'), idOf('dev-02@seed.local'));
const c2 = await convoBetween(idOf('dev-03@seed.local'), idOf('dev-04@seed.local'));
const dev01 = await login('dev-01@seed.local');
const dev02 = await login('dev-02@seed.local');
const dev03 = await login('dev-03@seed.local');
const dev04 = await login('dev-04@seed.local');

// --- 1. block-lock both directions, then restore ---
await dev03.from('blocks').insert({ blocker_id: idOf('dev-03@seed.local'), blocked_id: idOf('dev-04@seed.local') });
const blockedByOther = await dev04
  .from('messages')
  .insert({ conversation_id: c2, sender_id: idOf('dev-04@seed.local'), content_text: 'hello?' });
const blockedBySelf = await dev03
  .from('messages')
  .insert({ conversation_id: c2, sender_id: idOf('dev-03@seed.local'), content_text: 'hello?' });
verdict(
  'probe 1: block locks both directions',
  blockedByOther.error?.message?.includes('locked') === true &&
    blockedBySelf.error?.message?.includes('locked') === true,
  `other=${blockedByOther.error?.message} self=${blockedBySelf.error?.message}`,
);
await dev03.from('blocks').delete().eq('blocker_id', idOf('dev-03@seed.local')).eq('blocked_id', idOf('dev-04@seed.local'));
const restored = await dev04
  .from('messages')
  .insert({ conversation_id: c2, sender_id: idOf('dev-04@seed.local'), content_text: 'back' })
  .select('id')
  .single();
verdict('probe 1b: unblock restores sending', restored.error === null, restored.error?.message);
if (!restored.error) await admin.from('messages').delete().eq('id', restored.data.id);

// --- 2+3. realtime delivery to participant, silence to outsiders ---
const received = [];
const channel = dev01.channel('probe-room').on(
  'postgres_changes',
  { event: 'INSERT', schema: 'public', table: 'messages' },
  (payload) => received.push(payload.new),
);
await new Promise((resolve, reject) => {
  channel.subscribe((status, err) => {
    if (status === 'SUBSCRIBED') resolve(null);
    else if (err ?? status === 'CHANNEL_ERROR') reject(new Error(`subscribe: ${err ?? status}`));
  });
  setTimeout(() => reject(new Error('subscribe timeout')), 15000);
});
// Settle: SUBSCRIBED fires before the replication path is fully live —
// inserting immediately flakes (observed once). Two seconds is cheap certainty.
await new Promise((resolve) => setTimeout(resolve, 2000));
const mine = await dev02
  .from('messages')
  .insert({ conversation_id: c1, sender_id: idOf('dev-02@seed.local'), content_text: 'ping' })
  .select('id')
  .single();
const alien = await dev03
  .from('messages')
  .insert({ conversation_id: c2, sender_id: idOf('dev-03@seed.local'), content_text: 'other room' })
  .select('id')
  .single();
await new Promise((resolve) => setTimeout(resolve, 6000));
await dev01.removeChannel(channel);
const gotMine = received.some((m) => m.id === mine.data?.id);
const gotAlien = received.some((m) => m.id === alien.data?.id);
verdict('probe 2: realtime delivers to participant', gotMine, `seen=${received.length}`);
verdict('probe 3: realtime leaks nothing to outsiders', !gotAlien, gotAlien ? 'LEAKED' : 'silent');
await admin.from('messages').delete().in(
  'id',
  [mine.data?.id, alien.data?.id].filter(Boolean),
);

// --- 4. mark-read by the other party ---
const { data: stamped } = await dev01
  .from('messages')
  .insert({ conversation_id: c1, sender_id: idOf('dev-01@seed.local'), content_text: 'read me' })
  .select('id')
  .single();
const marked = stamped
  ? await dev02.from('messages').update({ read_at: new Date().toISOString() }).eq('id', stamped.id)
  : { error: new Error('no message') };
verdict('probe 4: other party can stamp read_at', marked.error === null, marked.error?.message);
if (stamped) await admin.from('messages').delete().eq('id', stamped.id);

console.log(failures === 0 ? 'ALL CHAT PROBES PASSED' : `${failures} probe(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
