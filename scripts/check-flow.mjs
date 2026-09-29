// End-to-end check of the booking flow, new-client fee and every security rule, run as real
// users against the LOCAL stack. Usage: `npm run db:start`, then `npm run check:ci`
// (resets the local DB) or `npm run seed && npm run check` (keeps your data).
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const noSession = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(URL, SERVICE, noSession); // = what you do in Supabase Studio

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
must(await admin.from('trainers').update({ is_kyc_approved: true, kyc_status: 'approved', is_available_now: true }).eq('id', trainer.uid));
must(await trainer.db.from('trainer_private').insert({ trainer_id: trainer.uid, instagram: 'check.coach' }));
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
const t = must(await admin.from('trainers').select().eq('id', trainer.uid).single());
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
must(await admin.from('sessions').update({ scheduled_at: new Date(Date.now() - 3600e3).toISOString() }).eq('id', first.id)); // it happened
must(await client.db.from('sessions').update({ status: 'completed', client_rating: 4 }).eq('id', first.id));
must(await client.db.from('reviews').insert({ id: first.id, session_id: first.id, client_id: client.uid, client_name: 'Test Client', trainer_id: trainer.uid, rating: 4, comment: 'Great session' }));
await blocked(client.db.from('reviews').upsert({ id: first.id, session_id: first.id, client_id: client.uid, trainer_id: trainer.uid, rating: 1 }).select(),
  'overwriting an existing review');
const stats = must(await admin.from('trainers').select('rating, total_reviews, total_sessions').eq('id', trainer.uid).single());
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

// ── File storage: own folder only
const png = new Uint8Array([137, 80, 78, 71]);
must(await client.db.storage.from('media').upload(`users/${client.uid}/profile.jpg`, png, { contentType: 'image/jpeg', upsert: true }));
ok('user uploaded to own folder');
await blocked(client.db.storage.from('media').upload(`users/${trainer.uid}/profile.jpg`, png, { contentType: 'image/jpeg', upsert: true }),
  "uploading into someone else's folder");
await blocked(client.db.storage.from('media').upload(`users/${client.uid}/evil.html`, png, { contentType: 'text/html', upsert: true }),
  'uploading a non-image/video file');

console.log('\nAll checks passed.');
