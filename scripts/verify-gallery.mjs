/**
 * Profile-gallery RPC probes (local dev ONLY).
 *
 * `get_profile_gallery(uuid)` is the ONLY stranger read path for full photo
 * lists (photo-row RLS stays own-row). It mirrors the deck exclusions:
 *  1. dev-01 sees dev-02's non-rejected photos (pending included, deck rule).
 *  2. rejected photos are excluded.
 *  3. blocked pair (either direction) sees nothing.
 *  4. own id yields nothing (this screen is for strangers).
 *  5. anonymous calls rejected.
 *  6. output is exactly (url, is_card_photo, order_index) — no ids, no flags.
 *
 * Usage (same shell where you seeded):
 *   $env:SUPABASE_URL = "http://127.0.0.1:54321"
 *   $env:SUPABASE_SERVICE_ROLE_KEY = "<sb_secret_... from `supabase start`>"
 *   $env:SUPABASE_ANON_KEY = "<sb_publishable_... from `supabase start`>"
 *   node scripts/verify-gallery.mjs
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
for (const n of [1, 3, 6, 7]) {
  if (!byEmail[`dev-0${n}@seed.local`]) {
    console.error('FAIL  setup — seed users missing. Run `npm run seed:dev` first.');
    process.exit(2);
  }
}
// Seed: dev-06 blocks dev-07 (existing block row) — the blocked pair.
const u1 = byEmail['dev-01@seed.local'];
const u3 = byEmail['dev-03@seed.local'];
const u7 = byEmail['dev-07@seed.local'];

// Reject one of dev-02's photos to prove exclusion (original restored below).
const profileOf = async (userId) => {
  const { data, error } = await admin.from('profiles').select('id').eq('user_id', userId).single();
  if (error || !data) throw new Error(`profile for ${userId}: ${error?.message}`);
  return data.id;
};
const targetProfile = await profileOf(u3);
const { data: photos, error: photosError } = await admin
  .from('profile_photos')
  .select('id, url, moderation_status')
  .eq('profile_id', targetProfile)
  .order('order_index')
  .limit(3);
if (photosError || !photos || photos.length < 3) {
  console.error('FAIL  setup — dev-02 needs 3+ photos. Run `npm run seed:dev` first.');
  process.exit(2);
}
const originalStatus = photos[0].moderation_status;
await admin.from('profile_photos').update({ moderation_status: 'rejected' }).eq('id', photos[0].id);

const login = async (email) => {
  const tmp = createClient(URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await tmp.auth.signInWithPassword({ email, password: 'Seedpass123!' });
  if (error || !data.session) throw new Error(`login ${email}: ${error?.message}`);
  return data.session.access_token;
};

const viewer = asUser(await login('dev-01@seed.local'));
const { data: gallery, error } = await viewer.rpc('get_profile_gallery', { p_user_id: u3 });
verdict('probe 1: gallery rpc succeeds', !error, error?.message);
if (!error) {
  const urls = gallery.map((r) => r.url);
  verdict('probe 2: rejected photo excluded', !urls.includes(photos[0].url), `${gallery.length} photo(s)`);
  verdict('probe 3: non-rejected photos visible', urls.includes(photos[1].url) && urls.includes(photos[2].url));
  const keys = new Set(gallery.flatMap((r) => Object.keys(r)));
  verdict(
    'probe 4: output is exactly (url, is_card_photo, order_index)',
    keys.size === 3 && keys.has('url') && keys.has('is_card_photo') && keys.has('order_index'),
    [...keys].join(','),
  );
}

{
  const blocked = asUser(await login('dev-06@seed.local'));
  const { data, error: blockError } = await blocked.rpc('get_profile_gallery', { p_user_id: u7 });
  verdict('probe 5: blocked pair sees nothing', !blockError && data.length === 0, blockError?.message);
}

{
  const self = await viewer.rpc('get_profile_gallery', { p_user_id: u1 });
  verdict('probe 6: own id yields nothing', !self.error && self.data.length === 0, self.error?.message);
}

{
  const anon = createClient(URL, ANON_KEY, { auth: { persistSession: false } });
  const { error: anonError } = await anon.rpc('get_profile_gallery', { p_user_id: u3 });
  verdict('probe 7: anonymous calls rejected', anonError !== null, anonError?.message ?? 'unexpectedly allowed');
}

{
  // Seed swipes dev-01 → dev-02 (skip): swiped profiles leave the gallery,
  // exactly like they leave the deck.
  const u2 = byEmail['dev-02@seed.local'];
  const swiped = await viewer.rpc('get_profile_gallery', { p_user_id: u2 });
  verdict('probe 8: swiped profiles see nothing', !swiped.error && swiped.data.length === 0, swiped.error?.message);
}

await admin.from('profile_photos').update({ moderation_status: originalStatus }).eq('id', photos[0].id);

if (failures > 0) {
  console.error(`${failures} probe(s) FAILED`);
  process.exit(1);
}
console.log('ALL GALLERY PROBES PASSED');
