/**
 * Dev-data seeder — realistic fake universe for local testing, no real users.
 *
 * Usage (local/staging ONLY — the script refuses any host containing 'prod'
 * unless you pass --force, and you should never need to):
 *
 *   SUPABASE_URL=http://localhost:54321 \
 *   SUPABASE_SERVICE_ROLE_KEY=<service-role key from `supabase start`> \
 *   node scripts/seed-dev.mjs
 *
 * What it does (idempotent — wipes `*@seed.local` users first, then rebuilds):
 *  1. Deletes ALL previous `@seed.local` auth users (including soft-deleted
 *     ones — deleted seed data can never linger across reseeds by construction).
 *  1. Creates 8 confirmed users via the Admin API (emails dev-01…dev-08@seed.local).
 *  2. Inserts profiles spread across wilayas (16 Alger … 31 Oran … 25 Constantine …),
 *     ages 22–34, mixed genders, Arabic/French/Darja bios.
 *  3. Adds 2–3 picsum placeholder photos each (first flagged as card photo).
 *  4. Seeds swipe actions, two ACCEPTED requests with conversations + messages
 *     (so chat screens have content), one pending request, one block.
 *
 * The service-role key is SERVER-ONLY: it lives in your shell env for this
 * script, never in `EXPO_PUBLIC_*` vars (CI greps for leaks).
 */
const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (SUPABASE_URL === '' || SERVICE_KEY === '') {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first. See script header.');
  process.exit(1);
}
if (/prod/i.test(SUPABASE_URL) && !process.argv.includes('--force')) {
  console.error('Refusing to seed what looks like production. Aborting.');
  process.exit(1);
}

const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const DEV_DOMAIN = 'seed.local';
const FIRST = ['Amine', 'Yasmine', 'Riyad', 'Nourhane', 'Mehdi', 'Sara', 'Walid', 'Lina'];
const LAST = ['Benali', 'Haddad', 'Boumediene', 'Ziani', 'Kaci', 'Mansouri', 'Belkacem', 'Cherif'];
const WILAYAS = [16, 16, 31, 25, 19, 23, 9, 6];
const BIOS = [
  'Coffee first, always. Weekend hiker and amateur photographer.',
  'Ocean person 🌊 — football, old-school playlists and golden-hour walks.',
  'Bridge views and home cooking. I make a great stew.',
  'Entrepreneur by day, film buff by night.',
  'Trail runner. Mountains every Friday, no excuses.',
  'Sea, theatre and hunting down the best food spots.',
  'Guitar and highlands. Here for good conversation.',
  'New in town — rediscovering the city one neighborhood at a time.',
];

const fail = (where, error) => {
  console.error(`seed failed at ${where}:`, error?.message ?? error);
  process.exit(1);
};

// 1. wipe previous seed users (service role bypasses RLS; cascades clean up)
const { data: existing } = await supabase.auth.admin.listUsers();
const seedIds = (existing?.users ?? [])
  .filter((u) => (u.email ?? '').endsWith(`@${DEV_DOMAIN}`))
  .map((u) => u.id);
for (const id of seedIds) {
  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) fail(`deleteUser ${id}`, error);
}
console.log(`cleared ${seedIds.length} previous seed user(s)`);

// 2. create users (email-confirmed so no inbox needed)
const userIds = [];
for (let i = 0; i < FIRST.length; i += 1) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: `dev-${String(i + 1).padStart(2, '0')}@${DEV_DOMAIN}`,
    password: 'Seedpass123!',
    email_confirm: true,
    user_metadata: { seed: true },
  });
  if (error || !data.user) fail(`createUser ${i}`, error);
  userIds.push(data.user.id);
}

// 3. profiles
const profiles = [];
for (let i = 0; i < userIds.length; i += 1) {
  const row = {
    user_id: userIds[i],
    display_name: `${FIRST[i]} ${LAST[i]}`,
    age: 22 + ((i * 3) % 13),
    gender: i % 2 === 0 ? 'male' : 'female',
    wilaya: WILAYAS[i],
    bio: BIOS[i],
  };
  const { data, error } = await supabase.from('profiles').insert(row).select('id').single();
  if (error || !data) fail(`profile ${i}`, error);
  profiles.push(data.id);
}

// 4. photos (picsum placeholders; first = card photo via partial unique index)
for (let i = 0; i < profiles.length; i += 1) {
  const rows = [0, 1, 2].map((n) => ({
    profile_id: profiles[i],
    url: `https://picsum.photos/seed/dzseed-${i}-${n}/600/800`,
    order_index: n,
    is_card_photo: n === 0,
  }));
  const { error } = await supabase.from('profile_photos').insert(rows);
  if (error) fail(`photos ${i}`, error);
}

// 5. social graph: swipes everywhere, requests 0→1 (accepted), 2→3 (accepted), 4→5 (pending)
const req = async (a, b, status) => {
  const { data, error } = await supabase
    .from('friend_requests')
    .insert({ sender_id: userIds[a], receiver_id: userIds[b] })
    .select('id')
    .single();
  if (error || !data) fail(`request ${a}->${b}`, error);
  if (status !== 'pending') {
    const { error: updateError } = await supabase
      .from('friend_requests')
      .update({ status })
      .eq('id', data.id);
    if (updateError) fail(`request ${a}->${b} update`, updateError);
  }
  return data.id;
};
for (let i = 0; i < userIds.length; i += 1) {
  const target = userIds[(i + 1) % userIds.length];
  const { error } = await supabase
    .from('swipe_actions')
    .insert({ swiper_id: userIds[i], swiped_id: target, action: i % 3 === 0 ? 'skip' : 'request' });
  if (error) fail(`swipe ${i}`, error);
}
await req(0, 1, 'accepted');
await req(2, 3, 'accepted');
await req(4, 5, 'pending');

// 6. conversations + messages for the accepted pairs (canonical a<b ordering)
const convo = async (a, b) => {
  const [x, y] = userIds[a] < userIds[b] ? [userIds[a], userIds[b]] : [userIds[b], userIds[a]];
  const { data, error } = await supabase
    .from('conversations')
    .insert({ participant_a_id: x, participant_b_id: y })
    .select('id')
    .single();
  if (error || !data) fail(`convo ${a}-${b}`, error);
  return data.id;
};
const say = async (convoId, from, text) => {
  const { error } = await supabase
    .from('messages')
    .insert({ conversation_id: convoId, sender_id: userIds[from], content_text: text });
  if (error) fail('message', error);
};
const c1 = await convo(0, 1);
  await say(c1, 0, 'Hey Yasmine! Looks like we hang out at the same cafes 👀');
  await say(c1, 1, 'Haha maybe! Do you know the one near the central post office?');
  await say(c1, 0, 'Yes — best flat white downtown, no contest.');
const c2 = await convo(2, 3);
await say(c2, 2, 'Azul ! Tu randonnes souvent vers Yakouren ?');
await say(c2, 3, 'Azul Riyad ! Oui, presque chaque mois. On s’organise une sortie ?');

// 7. one block (5 blocks 6) so moderation surfaces have content
{
  const { error } = await supabase.from('blocks').insert({ blocker_id: userIds[5], blocked_id: userIds[6] });
  if (error) fail('block', error);
}

console.log(
  'seed complete: 8 users, 8 profiles, 24 photos, swipes, 3 requests, 2 convos, 5 messages, 1 block.',
);
console.log('log in with any dev-0X@seed.local / Seedpass123!');
