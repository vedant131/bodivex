// End-to-end check of the booking flow, new-client fee and every security rule, run as real
// users against the LOCAL stack. Usage: `npm run db:start`, then `npm run check:ci`
// (resets the local DB) or `npm run seed && npm run check` (keeps your data).
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:55321';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const noSession = { auth: { persistSession: false, autoRefreshToken: false } };
const adminDb = createClient(URL, SERVICE, noSession); // = what you do in Supabase Studio

const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
const uniq = () => `${Date.now()}${Math.floor(Math.random() * 1e4)}`.slice(-8);
const ok = (label) => console.log(`  ✓ ${label}`);

/** Blocked = an error, or row-level security silently matched nothing. */
const blocked = async (query, label) => {
  const { data, error } = await query;
  const nothing = error || data == null || (Array.isArray(data) && data.length === 0);
  assert.ok(nothing, `should be blocked: ${label} — got ${JSON.stringify(data)}`);
  console.log(`  ✓ blocked: ${label}`);
};

// One client per person, like separate phones.
async function newUser(prefix, role) {
  const db = createClient(URL, ANON, noSession);
  const phone = `+91${prefix}${uniq()}`;
  const { user } = must(await db.auth.signUp({ email: `${phone.slice(1)}@phone.bodivex.dev`, password: 'dev-only-password' }));
  if (role) must(await db.from('users').insert({ id: user.id, phone, role, name: `Test ${role}` }));
  return { db, uid: user.id, phone };
}

const VIDEO = 'https://example.com/intro.mp4';

// ── Fresh approved trainer each run
const trainer = await newUser('70', 'trainer');
must(await trainer.db.from('trainers').insert({ id: trainer.uid, user_id: trainer.uid, name: 'Check Coach', city: 'Mumbai', pricing_online: 499, video_intro_url: VIDEO }));
must(await adminDb.from('trainers').update({ is_kyc_approved: true, kyc_status: 'approved', is_available_now: true }).eq('id', trainer.uid));
must(await trainer.db.from('trainer_private').insert({ trainer_id: trainer.uid, instagram: 'check.coach', facebook: 'check.fb' }));
const accept = (sessionId, payment = null) => trainer.db.rpc('accept_booking', { p_session: sessionId, p_payment: payment });

// ── Client signs up
const client = await newUser('88', 'client');
must(await client.db.from('clients').upsert({ user_id: client.uid, name: 'Test Client', city: 'Mumbai' }));
ok('client signed up');
await blocked(client.db.from('users').update({ role: 'trainer' }).eq('id', client.uid).select(), 'client changing own role');
await blocked(client.db.from('users').insert({ id: trainer.uid, phone: 'x', role: 'client' }).select(), 'creating a user row for someone else');

// ── Discovery
const mumbai = must(await client.db.from('trainers').select('id').eq('is_kyc_approved', true).eq('city', 'Mumbai'));
assert.ok(mumbai.length >= 2, 'expected seeded Mumbai trainers (run `npm run seed`)');
ok(`found ${mumbai.length} Mumbai trainers`);
await blocked(client.db.from('clients').select().eq('user_id', trainer.uid), "reading another user's private profile");

// ── Trainer can't fake approval, stats or fee counters
await blocked(trainer.db.from('trainers').update({ rating: 5 }).eq('id', trainer.uid).select(), 'trainer editing own rating');
await blocked(trainer.db.from('trainers').update({ lead_count: -99 }).eq('id', trainer.uid).select(), 'trainer resetting fee counter');
const pending = await newUser('77', 'trainer');
await blocked(pending.db.from('trainers').insert({ id: pending.uid, user_id: pending.uid, name: 'Sneaky', is_kyc_approved: true, video_intro_url: VIDEO }).select(),
  'new trainer self-approving');
await blocked(pending.db.from('trainers').insert({ id: pending.uid, user_id: pending.uid, name: 'New Coach' }).select(),
  'trainer signing up without an intro video');
must(await pending.db.from('trainers').insert({ id: pending.uid, user_id: pending.uid, name: 'New Coach', video_intro_url: VIDEO }));
ok('trainer signs up with an intro video (pending approval)');
await blocked(pending.db.from('trainers').update({ video_intro_url: null }).eq('id', pending.uid).select(), 'trainer removing their intro video');
await blocked(client.db.from('trainers').select().eq('id', pending.uid), 'client seeing an unapproved trainer');

// ── Booking: the DB's slot lock allows one live booking per trainer-hour
let hour = 0;
const book = async (who, key = `2099-01-01-${String(hour++).padStart(2, '0')}-${uniq()}`) => {
  const chat = must(await who.db.from('chats').insert({ participants: [who.uid, trainer.uid], trainer_id: trainer.uid }).select('id').single());
  const s = await who.db.from('sessions').insert({
    client_id: who.uid, trainer_id: trainer.uid, client_name: 'Test', trainer_name: 'Check Coach', type: 'online',
    scheduled_at: new Date(Date.now() + 86400e3).toISOString(), slot_key: key, price: 499, chat_id: chat.id,
  }).select('id').single();
  return { ...s, id: s.data?.id, key, chatId: chat.id };
};

const first = await book(client);
assert.ok(first.id, first.error?.message);
ok('client booked a slot');
const rival = await newUser('66', 'client');
await blocked(book(rival, first.key), 'second client double-booking the same slot');
await blocked(rival.db.from('sessions').select().eq('id', first.id), "reading someone else's booking");
assert.ok(must(await rival.db.rpc('booked_slot_keys', { p_trainer: trainer.uid })).includes(first.key));
ok('others see the hour as busy (key only)');
await blocked(client.db.from('sessions').insert({
  client_id: client.uid, trainer_id: pending.uid, client_name: 'x', trainer_name: 'x', type: 'online',
  scheduled_at: new Date().toISOString(), slot_key: 'x', price: 1,
}).select(), 'booking an unapproved trainer');
await blocked(client.db.from('sessions').insert({
  client_id: rival.uid, trainer_id: trainer.uid, client_name: 'x', trainer_name: 'x', type: 'online',
  scheduled_at: new Date().toISOString(), slot_key: 'y', price: 1,
}).select(), 'booking on behalf of someone else');

// ── Accepting: only via accept_booking (fee), never by writing directly
await blocked(trainer.db.from('sessions').update({ status: 'confirmed' }).eq('id', first.id).select(), 'trainer confirming without the fee check');
await blocked(trainer.db.from('chats').update({ is_unlocked: true }).eq('id', first.chatId).select(), 'trainer unlocking chat directly');
await blocked(client.db.rpc('send_message', { p_chat: first.chatId, p_type: 'text', p_text: 'hi', p_photo_url: null, p_voice_url: null, p_voice_secs: null, p_sender_name: 'x' }),
  'messaging before trainer accepts');
await blocked(client.db.from('messages').insert({ chat_id: first.chatId, sender_id: client.uid, text: 'hi' }).select(), 'writing messages directly');
await blocked(client.db.from('trainer_private').select().eq('trainer_id', trainer.uid), "client reading trainer's socials");
await blocked(rival.db.rpc('accept_booking', { p_session: first.id, p_payment: null }), 'someone else accepting the booking');

assert.equal(must(await accept(first.id)).fee, 0);
ok('new client #1 accepted free');
const confirmed = must(await client.db.from('sessions').select().eq('id', first.id).single());
assert.equal(confirmed.trainer_social?.instagram, 'check.coach');
assert.equal(confirmed.trainer_social?.facebook, 'check.fb');
assert.equal(confirmed.trainer_social?.trainer_id, undefined);
ok('socials revealed to client only after acceptance');
assert.ok(confirmed.video_call_room_id, 'online session gets a video room');
ok('online session got a video room');
must(await client.db.rpc('send_message', { p_chat: first.chatId, p_type: 'text', p_text: 'See you tomorrow!', p_photo_url: null, p_voice_url: null, p_voice_secs: null, p_sender_name: 'Test Client' }));
const chatRow = must(await trainer.db.from('chats').select().eq('id', first.chatId).single());
assert.equal(chatRow.unread_count[trainer.uid], 1);
ok('chat unlocked by acceptance; trainer has 1 unread');
must(await trainer.db.rpc('mark_chat_read', { p_chat: first.chatId }));
assert.equal(must(await trainer.db.from('chats').select('unread_count').eq('id', first.chatId).single()).unread_count[trainer.uid], 0);
ok('mark as read resets the count');
await blocked(rival.db.from('messages').select().eq('chat_id', first.chatId), "reading someone else's chat");

// Clients #2 and #3 free, #4 must pay
for (const n of [2, 3]) {
  const c = await newUser('55', 'client');
  assert.equal(must(await accept((await book(c)).id)).fee, 0);
  ok(`new client #${n} accepted free`);
}
const fourth = await newUser('44', 'client');
const fourthBooking = await book(fourth);
assert.equal(must(await trainer.db.rpc('accept_fee', { p_client: fourth.uid })), 149);
const unpaid = await accept(fourthBooking.id);
assert.equal(unpaid.error?.message, 'payment-required'); assert.equal(unpaid.error?.details, '149');
ok('new client #4 blocked until ₹149 is paid');
assert.equal(must(await accept(fourthBooking.id, 'test')).fee, 149);
ok('new client #4 accepted after (test) payment');
assert.equal(must(await accept((await book(client)).id)).fee, 0);
ok('returning client accepted free');
const t = must(await adminDb.from('trainers').select().eq('id', trainer.uid).single());
assert.equal(t.lead_count, 4); assert.equal(t.fees_paid, 149);
assert.equal(must(await trainer.db.from('leads').select()).length, 4);
ok('ledger: 4 clients, ₹149 paid');
await blocked(client.db.from('leads').select().eq('trainer_id', trainer.uid), "client reading the trainer's fee ledger");

// ── Not taking bookings → clients can't request
must(await trainer.db.from('trainers').update({ is_available_now: false }).eq('id', trainer.uid));
await blocked(book(await newUser('33', 'client')), 'booking while trainer is not taking bookings');
must(await trainer.db.from('trainers').update({ is_available_now: true }).eq('id', trainer.uid));

// ── Decline / cancel free the slot
const toDecline = await book(rival);
must(await trainer.db.from('sessions').update({ status: 'cancelled', cancel_reason: 'busy' }).eq('id', toDecline.id));
assert.ok((await book(fourth, toDecline.key)).id);
ok('trainer declined and the slot was bookable again');
const toCancel = await book(client);
await blocked(client.db.from('sessions').update({ status: 'confirmed' }).eq('id', toCancel.id).select(), 'client confirming own booking');
must(await client.db.from('sessions').update({ status: 'cancelled', cancel_reason: 'Cancelled by client' }).eq('id', toCancel.id));
assert.ok((await book(rival, toCancel.key)).id);
ok('client cancelled and the slot was bookable again');

// ── Complete + review → rating/totals updated by triggers
await blocked(client.db.from('sessions').update({ status: 'completed', client_rating: 5 }).eq('id', first.id).select(),
  'completing (and reviewing) before the session time');
await blocked(client.db.from('reviews').insert({ id: first.id, session_id: first.id, client_id: client.uid, trainer_id: trainer.uid, rating: 5 }).select(),
  'reviewing a session that is not completed');
must(await adminDb.from('sessions').update({ scheduled_at: new Date(Date.now() - 3600e3).toISOString() }).eq('id', first.id)); // it happened
await blocked(trainer.db.rpc('complete_session', { p_session: first.id, p_rating: 5, p_review: 'self review' }), 'trainer completing and reviewing their own session');
must(await client.db.rpc('complete_session', { p_session: first.id, p_rating: 4, p_review: 'Great session' }));
assert.equal(must(await client.db.from('reviews').select('comment').eq('id', first.id).single()).comment, 'Great session');
ok('session completed and review saved in one transaction');
await blocked(client.db.from('reviews').upsert({ id: first.id, session_id: first.id, client_id: client.uid, trainer_id: trainer.uid, rating: 1 }).select(),
  'overwriting an existing review');
const stats = must(await adminDb.from('trainers').select('rating, total_reviews, total_sessions').eq('id', trainer.uid).single());
assert.equal(Number(stats.rating), 4); assert.equal(stats.total_reviews, 1); assert.equal(stats.total_sessions, 1);
ok('review updated rating (4.0) and session count');

// ── Gym directory
const gym = must(await client.db.from('gyms').insert({ name: 'Check Gym Baner', area: 'Baner', city: 'Pune', created_by: client.uid }).select().single());
ok('client added a gym to the directory');
await blocked(client.db.from('gyms').insert({ name: 'Fake Gym', area: 'x', city: 'Pune', created_by: trainer.uid }).select(), 'adding a gym as someone else');
await blocked(client.db.from('gyms').insert({ name: 'Call 98765 43210', area: 'x', city: 'Pune', created_by: client.uid }).select(), 'contact info in a gym name');
await blocked(client.db.from('gyms').update({ name: 'Renamed' }).eq('id', gym.id).select(), 'editing a gym entry');

// ── Public Q&A: no contact details
const ask = (question) => client.db.from('qa').insert({ trainer_id: trainer.uid, client_id: client.uid, client_name: 'Test Client', question }).select('id').single();
const qa = must(await ask('Do you train beginners?'));
ok('client asked a normal question');
await blocked(ask('call me on 98765 43210'), 'phone number in Q&A');
await blocked(ask('see instagram.com/me'), 'link / social in Q&A');
await blocked(ask('mail me at a@b.co'), 'email in Q&A');
await blocked(client.db.from('qa').update({ answer: 'fake answer' }).eq('id', qa.id).select(), 'client answering for trainer');
await blocked(trainer.db.from('qa').update({ answer: 'WhatsApp me' }).eq('id', qa.id).select(), 'trainer sharing contact in answer');
must(await trainer.db.from('qa').update({ answer: 'Yes!', answered_at: new Date().toISOString() }).eq('id', qa.id));
ok('trainer answered question');

// ── Scale: search, rankings and chat filters run in the database
const page1 = must(await client.db.rpc('search_trainers', { p_city: 'Mumbai', p_limit: 2, p_offset: 0 }));
const page2 = must(await client.db.rpc('search_trainers', { p_city: 'Mumbai', p_limit: 2, p_offset: 2 }));
assert.equal(page1.length, 2); assert.ok(!page2.some((t) => page1.some((u) => u.id === t.id)));
ok('search returns one page at a time, no overlap between pages');
const byText = must(await client.db.rpc('search_trainers', { p_q: 'check coach' }));
assert.ok(byText.some((t) => t.id === trainer.uid));
assert.ok(!must(await client.db.rpc('search_trainers', { p_q: 'New Coach' })).some((t) => t.id === pending.uid));
ok('text search runs on the server and still hides unapproved coaches');
const mixed = must(await client.db.rpc('search_trainers', { p_city: 'Mumbai', p_online_anywhere: true, p_limit: 50 }));
assert.ok(mixed.some((t) => t.city === 'Pune' && t.session_preference === 'online'), 'online Pune coach should appear for Mumbai');
assert.ok(!mixed.some((t) => t.city !== 'Mumbai' && t.session_preference === 'offline'), 'in-person-only coaches stay in their city');
const firstOther = mixed.findIndex((t) => t.city !== 'Mumbai');
assert.ok(firstOther === -1 || mixed.slice(firstOther).every((t) => t.city !== 'Mumbai'), 'same-city coaches are listed first');
ok('city search adds online coaches from other cities, same city first, never in-person-only ones');
const ranks = must(await client.db.rpc('trainer_rankings', { p_city: null, p_mode: 'all', p_limit: 500 }));
assert.ok(ranks.every((r, i) => i === 0 || r.rank >= ranks[i - 1].rank));
const mine = must(await trainer.db.rpc('my_trainer_rank', { p_city: null, p_mode: 'all' }));
assert.equal(mine, ranks.find((r) => r.trainer.id === trainer.uid).rank);
assert.equal(must(await pending.db.rpc('my_trainer_rank', { p_city: null, p_mode: 'all' })), null);
ok(`rankings computed in the database (coach is #${mine}; unapproved coach has no rank)`);
assert.equal(must(await client.db.from('chats').select('client_id').eq('id', first.chatId).single()).client_id, client.uid);
ok('chats carry client_id so live updates can be filtered per user');

// ── Admin review of new coaches
assert.equal(must(await pending.db.rpc('is_admin')), false);
await blocked(pending.db.rpc('admin_review_trainer', { p_trainer: pending.uid, p_approve: true }), 'coach approving themselves via the admin function');
await blocked(client.db.rpc('admin_list_trainers', { p_status: 'pending' }), 'non-admin listing coaches with phone numbers');
await blocked(pending.db.from('admins').insert({ user_id: pending.uid }).select(), 'making yourself an admin');
const admin = await newUser('99', 'client');
must(await adminDb.from('admins').insert({ user_id: admin.uid }));
assert.equal(must(await admin.db.rpc('is_admin')), true);
const queue = must(await admin.db.rpc('admin_list_trainers', { p_status: 'pending' }));
const queued = queue.find((r) => r.trainer.id === pending.uid);
assert.ok(queued && queued.phone === pending.phone);
ok('admin sees the pending coach with their phone number');
await blocked(admin.db.rpc('admin_review_trainer', { p_trainer: pending.uid, p_approve: false, p_note: ' ' }), 'rejecting without a reason');
must(await admin.db.rpc('admin_review_trainer', { p_trainer: pending.uid, p_approve: false, p_note: 'Certificate photo unclear' }));
let me2 = must(await pending.db.from('trainers').select('kyc_status, kyc_note').eq('id', pending.uid).single());
assert.equal(me2.kyc_status, 'rejected'); assert.equal(me2.kyc_note, 'Certificate photo unclear');
ok('rejected coach sees the reason');
must(await pending.db.from('trainers').update({ bio: 'Updated bio with a clear certificate photo' }).eq('id', pending.uid));
me2 = must(await pending.db.from('trainers').select('kyc_status').eq('id', pending.uid).single());
assert.equal(me2.kyc_status, 'pending');
ok('saving the profile sends it back for review');
must(await admin.db.rpc('admin_review_trainer', { p_trainer: pending.uid, p_approve: true }));
assert.ok(must(await client.db.from('trainers').select('id').eq('id', pending.uid)).length === 1);
ok('approved coach becomes visible to clients');

// ── Delete my account (App Store requirement)
const leaver = await newUser('22', 'client');
must(await leaver.db.from('clients').upsert({ user_id: leaver.uid, name: 'Leaving Client', city: 'Mumbai' }));
const leaverBooking = await book(leaver);
assert.ok(leaverBooking.id);
must(await accept(leaverBooking.id, 'test'));  // coach now has a fee/lead record for this client
must(await leaver.db.from('qa').insert({ trainer_id: trainer.uid, client_id: leaver.uid, client_name: 'Leaving Client', question: 'Do you coach beginners?' }));
must(await leaver.db.rpc('delete_my_account'));
assert.equal(must(await adminDb.from('users').select('id').eq('id', leaver.uid)).length, 0);
assert.equal(must(await adminDb.from('sessions').select('id').eq('client_id', leaver.uid)).length, 0);
assert.equal(must(await adminDb.from('chats').select('id').eq('id', leaverBooking.chatId)).length, 0);
const ledger = must(await adminDb.from('leads').select('client_name').eq('client_id', leaver.uid).single());
assert.equal(ledger.client_name, 'Deleted user');
assert.equal(must(await adminDb.from('qa').select('client_name').eq('client_id', leaver.uid).single()).client_name, 'Deleted user');
const relogin = await createClient(URL, ANON, noSession).auth.signInWithPassword({ email: `${leaver.phone.slice(1)}@phone.bodivex.dev`, password: 'dev-only-password' });
assert.ok(relogin.error, 'deleted login must not work');
assert.ok(must(await adminDb.from('trainers').select('id').eq('id', trainer.uid)).length === 1);
ok('account deleted: profile, bookings, chat and login gone; coach keeps an anonymous fee record');
await blocked(createClient(URL, ANON, noSession).rpc('delete_my_account'), 'deleting an account without signing in');

// ── File storage: own folder only
const png = new Uint8Array([137, 80, 78, 71]);
must(await client.db.storage.from('media').upload(`users/${client.uid}/profile.jpg`, png, { contentType: 'image/jpeg', upsert: true }));
ok('user uploaded to own folder');
await blocked(client.db.storage.from('media').upload(`users/${trainer.uid}/profile.jpg`, png, { contentType: 'image/jpeg', upsert: true }),
  "uploading into someone else's folder");
await blocked(client.db.storage.from('media').upload(`users/${client.uid}/evil.html`, png, { contentType: 'text/html', upsert: true }),
  'uploading a non-image/video file');

console.log('\nAll checks passed.');
