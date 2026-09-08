/**
 * Profile/storage negative-probe script (local dev ONLY).
 *
 *  1. dev-01 uploads to their own storage path → must succeed.
 *  2. dev-02 downloads dev-01's object → must fail (storage RLS).
 *  3. dev-02 selects dev-01's photo rows → must see 0 rows (table RLS).
 *  4. Two concurrent card-photo sets on one profile → exactly one card wins.
 *
 * Cleans up after itself (test object + row removed; seed counts restored).
 *
 * Usage (same shell as seeding):
 *   $env:SUPABASE_URL = "http://127.0.0.1:54321"
 *   $env:SUPABASE_ANON_KEY = "<sb_publishable_... from `supabase start`>"
 *   node scripts/verify-profile.mjs
 */
const URL = process.env.SUPABASE_URL ?? '';
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? '';

if (URL === '' || ANON_KEY === '') {
  console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY first.');
  process.exit(2);
}
if (/prod/i.test(URL)) {
  console.error('Refusing to probe what looks like production. Aborting.');
  process.exit(2);
}

const { createClient } = await import('@supabase/supabase-js');

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

const dev01 = await login('dev-01@seed.local');
const dev02 = await login('dev-02@seed.local');
const { data: user01 } = await dev01.auth.getUser();
const uid01 = user01.user.id;

// --- 1. own-path upload succeeds ---
const probePath = `${uid01}/probe.png`;
const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const up = await dev01.storage.from('profile-photos').upload(probePath, bytes, {
  contentType: 'image/png',
  upsert: true,
});
verdict('probe 1: own-path upload succeeds', up.error === null, up.error?.message);

// --- photo row for the probe object (needed for the card race + row RLS) ---
const { data: profile } = await dev01.from('profiles').select('id').eq('user_id', uid01).single();
let probeRowId = null;
if (profile) {
  const { data: row } = await dev01
    .from('profile_photos')
    .insert({ profile_id: profile.id, url: probePath, order_index: 99, is_card_photo: false })
    .select('id')
    .single();
  probeRowId = row?.id ?? null;
}

// --- 2. cross-user object download fails ---
const stolen = await dev02.storage.from('profile-photos').download(probePath);
verdict(
  'probe 2: cross-user object download denied',
  stolen.error !== null,
  stolen.error ? `rejected: ${stolen.error.message}` : 'DOWNLOAD SUCCEEDED — storage RLS broken',
);

// --- 3. cross-user photo rows invisible (own rows must still show) ---
const { data: rows, error: rowsError } = await dev02.from('profile_photos').select('id');
const { data: ownerRows } = await dev01.from('profile_photos').select('id');
const ownerIds = new Set((ownerRows ?? []).map((r) => r.id));
const leaked = (rows ?? []).filter((r) => ownerIds.has(r.id));
verdict(
  'probe 3: cross-user photo rows invisible',
  rowsError === null && leaked.length === 0 && (rows ?? []).length > 0,
  rowsError
    ? `unexpected error: ${rowsError.message}`
    : `${leaked.length} leaked, ${(rows ?? []).length} own visible`,
);

// --- 4. concurrent card sets converge to exactly one card ---
if (profile) {
  const { data: photos } = await dev01.from('profile_photos').select('id').eq('profile_id', profile.id);
  const ids = (photos ?? []).map((p) => p.id).slice(0, 2);
  if (ids.length === 2) {
    const setCard = async (id) => {
      await dev01.from('profile_photos').update({ is_card_photo: false }).eq('profile_id', profile.id);
      await dev01.from('profile_photos').update({ is_card_photo: true }).eq('id', id);
    };
    await Promise.all([setCard(ids[0]), setCard(ids[1])]);
    const { data: cards } = await dev01
      .from('profile_photos')
      .select('id')
      .eq('profile_id', profile.id)
      .eq('is_card_photo', true);
    verdict(
      'probe 4: exactly one card photo wins the race',
      (cards ?? []).length === 1,
      `${(cards ?? []).length} card(s)`,
    );
  } else {
    verdict('probe 4: exactly one card photo wins the race', false, 'need 2+ photos on dev-01');
  }
}

// --- cleanup: probe row + object, seed counts restored ---
if (probeRowId) await dev01.from('profile_photos').delete().eq('id', probeRowId);
await dev01.storage.from('profile-photos').remove([probePath]);

console.log(failures === 0 ? 'ALL PROFILE PROBES PASSED' : `${failures} probe(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
