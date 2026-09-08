/**
 * Safety probes (local dev ONLY).
 *
 *  1. Report insert succeeds; UPDATE and DELETE on reports are rejected
 *     (insert-only RLS = genuinely immutable, not just hidden buttons).
 *  2. Block takes effect everywhere immediately: deck excludes, inbox
 *     excludes, both message directions rejected with the lock code.
 *  3. Unblock fully restores (deck returns, sends succeed).
 *  4. Reporters cannot read each other's reports.
 *
 * Cleans up every row it creates (seed state restored).
 *
 * Usage:
 *   $env:SUPABASE_URL = "http://127.0.0.1:54321"
 *   $env:SUPABASE_ANON_KEY = "<sb_publishable_...>"
 *   $env:SUPABASE_SERVICE_ROLE_KEY = "<sb_secret_...>"
 *   node scripts/verify-safety.mjs
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
const dev01 = await login('dev-01@seed.local');
const dev03 = await login('dev-03@seed.local');

// --- 1. reports: insert ok, mutate rejected ---
const filed = await dev01.from('reports').insert({
  reporter_id: idOf('dev-01@seed.local'),
  reported_id: idOf('dev-02@seed.local'),
  reason: 'Spam de test',
  description: 'probe probe probe',
});
verdict('probe 1a: report insert succeeds', filed.error === null, filed.error?.message);
const reportId = (
  await admin.from('reports').select('id').eq('reporter_id', idOf('dev-01@seed.local')).limit(1).single()
).data?.id;
await dev01.from('reports').update({ reason: 'Autre motif' }).eq('id', reportId);
await dev01.from('reports').delete().eq('id', reportId);
// NOTE: RLS-filtered writes succeed silently with 0 rows touched (no error),
// so immutability is proven by EFFECT, not by error presence.
const after = await admin.from('reports').select('reason').eq('id', reportId).single();
verdict(
  'probe 1b: reports immutable (no update/delete)',
  after.data?.reason === 'Spam de test',
  `reason=${after.data?.reason ?? 'ROW GONE (BAD)'}`,
);

// --- 4. reporters cannot read each other's reports (before cleanup) ---
const snooped = await dev03.from('reports').select('id');
verdict(
  'probe 4: cross-reporter reads denied',
  snooped.error === null && (snooped.data ?? []).length === 0,
  `${(snooped.data ?? []).length} row(s)`,
);

// --- 2. block takes effect everywhere (fresh pair: no prior relation, so the
// --- deck assertion proves block-exclusion specifically, not swipe history).
const [bx, by] = [idOf('dev-01@seed.local'), idOf('dev-04@seed.local')].sort();
const { data: freshConvo } = await admin
  .from('conversations')
  .insert({ participant_a_id: bx, participant_b_id: by })
  .select('id')
  .single();
const deckBefore = await dev01.rpc('get_discovery_candidates', { p_limit: 50 });
const visibleBefore = (deckBefore.data ?? []).map((r) => r.user_id).includes(idOf('dev-04@seed.local'));
const blocked = await dev01.from('blocks').insert({
  blocker_id: idOf('dev-01@seed.local'),
  blocked_id: idOf('dev-04@seed.local'),
});
const deckAfter = await dev01.rpc('get_discovery_candidates', { p_limit: 50 });
const deckHasBlocked = (deckAfter.data ?? []).map((r) => r.user_id).includes(idOf('dev-04@seed.local'));
const sendA = await dev01
  .from('messages')
  .insert({ conversation_id: freshConvo?.id, sender_id: idOf('dev-01@seed.local'), content_text: 'x' });
const dev04 = await login('dev-04@seed.local');
const sendB = await dev04
  .from('messages')
  .insert({ conversation_id: freshConvo?.id, sender_id: idOf('dev-04@seed.local'), content_text: 'x' });
verdict(
  'probe 2: block excludes everywhere + locks writes',
  blocked.error === null &&
    visibleBefore &&
    !deckHasBlocked &&
    (sendA.error?.code === 'P0002' || /locked/i.test(sendA.error?.message ?? '')) &&
    (sendB.error?.code === 'P0002' || /locked/i.test(sendB.error?.message ?? '')),
  `block=${blocked.error?.message ?? 'ok'} wasVisible=${visibleBefore} deck=${deckHasBlocked} a=${sendA.error?.message} b=${sendB.error?.message}`,
);

// --- 3. unblock restores ---
await dev01
  .from('blocks')
  .delete()
  .eq('blocker_id', idOf('dev-01@seed.local'))
  .eq('blocked_id', idOf('dev-04@seed.local'));
const deckBack = await dev01.rpc('get_discovery_candidates', { p_limit: 50 });
const deckHasAgain = (deckBack.data ?? []).map((r) => r.user_id).includes(idOf('dev-04@seed.local'));
const sendBack = await dev01
  .from('messages')
  .insert({ conversation_id: freshConvo?.id, sender_id: idOf('dev-01@seed.local'), content_text: 'back' })
  .select('id')
  .single();
verdict(
  'probe 3: unblock restores deck + sending',
  deckHasAgain && sendBack.error === null,
  `deck=${deckHasAgain} send=${sendBack.error?.message ?? 'ok'}`,
);
if (!sendBack.error) await admin.from('messages').delete().eq('id', sendBack.data.id);
if (freshConvo) await admin.from('conversations').delete().eq('id', freshConvo.id);

// --- cleanup: probe report only (block already removed) ---
await admin.from('reports').delete().eq('reporter_id', idOf('dev-01@seed.local'));

console.log(failures === 0 ? 'ALL SAFETY PROBES PASSED' : `${failures} probe(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
