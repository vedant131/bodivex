// End-to-end check of the booking flow, new-client fee and security rules against the
// LOCAL emulator. Usage: `npm run emulators`, `npm run seed`, then `npm run check`.
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';

import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth, connectAuthEmulator, createUserWithEmailAndPassword,
} from 'firebase/auth';
import {
  getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, addDoc, updateDoc, getDocs,
  collection, query, where, serverTimestamp, setLogLevel, writeBatch, deleteDoc, deleteField,
} from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import { initializeApp as initAdmin } from 'firebase-admin/app';
import { getFirestore as adminDb, FieldValue } from 'firebase-admin/firestore';

// Ports come from `firebase emulators:exec` (check:ci) or default to `npm run emulators`
const HOSTS = {
  auth: process.env.FIREBASE_AUTH_EMULATOR_HOST,
  firestore: process.env.FIRESTORE_EMULATOR_HOST,
  functions: process.env.FUNCTIONS_EMULATOR_HOST ?? (process.env.FIRESTORE_EMULATOR_HOST?.endsWith(':18080') ? '127.0.0.1:15001' : '127.0.0.1:5001'),
};
const hostPort = (h) => { const [host, port] = h.split(':'); return [host, Number(port)]; };

setLogLevel('silent'); // expected permission-denied errors are asserted below
const admin = adminDb(initAdmin({ projectId: 'demo-bodivex' }));

const PASSWORD = 'emulator-only-password';
const uniq = () => `${Date.now()}${Math.floor(Math.random() * 1e4)}`.slice(-8);

// One Firebase app per person, like separate phones.
async function newUser(prefix) {
  const phone = `+91${prefix}${uniq()}`;
  const app = initializeApp({ apiKey: 'demo', projectId: 'demo-bodivex' }, phone);
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${HOSTS.auth}`, { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, ...hostPort(HOSTS.firestore));
  const fns = getFunctions(app);
  connectFunctionsEmulator(fns, ...hostPort(HOSTS.functions));
  const cred = await createUserWithEmailAndPassword(auth, `${phone.slice(1)}@phone.bodivex.dev`, PASSWORD);
  return { app, db, fns, uid: cred.user.uid, phone };
}

const denied = async (promise, label) => {
  await assert.rejects(promise, (e) => e.code === 'permission-denied', `should be denied: ${label}`);
  console.log(`  ✓ blocked: ${label}`);
};
const ok = (label) => console.log(`  ✓ ${label}`);

// ── Fresh approved trainer each run (admin = what you do in the emulator UI)
const trainer = await newUser('70');
await admin.doc(`trainers/${trainer.uid}`).set({
  userId: trainer.uid, name: 'Check Coach', city: 'Mumbai', state: 'Maharashtra', specializations: [],
  rating: 0, totalReviews: 0, totalSessions: 0, isKYCApproved: true, kycStatus: 'approved',
  isAvailableNow: true, sessionPreference: 'both', pricingOnline: 499,
});
await admin.doc(`trainers/${trainer.uid}/private/social`).set({ instagram: 'check.coach' });
const accept = (sessionId, payment) =>
  httpsCallable(trainer.fns, 'acceptBooking')({ sessionId, ...(payment && { payment }) })
    .then((r) => r.data)
    .catch((e) => { if (process.env.DEBUG_CHECK) console.error('acceptBooking error', HOSTS, e.code, e.message, e.details); throw e; });

// ── Client signs up
const client = await newUser('88');
await setDoc(doc(client.db, 'users', client.uid), {
  phone: client.phone, name: 'Test Client', role: 'client', kycStatus: 'not_started', aadhaarVerified: false,
  createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
});
await setDoc(doc(client.db, 'clients', client.uid), { name: 'Test Client', city: 'Mumbai', userId: client.uid });
ok('client signed up');
await denied(updateDoc(doc(client.db, 'users', client.uid), { role: 'trainer' }), 'client changing own role');

// ── Discovery
const mumbai = await getDocs(query(collection(client.db, 'trainers'),
  where('isKYCApproved', '==', true), where('city', '==', 'Mumbai')));
assert.ok(mumbai.size >= 2, 'expected seeded Mumbai trainers (run `npm run seed`)');
ok(`found ${mumbai.size} Mumbai trainers`);
await denied(getDoc(doc(client.db, 'clients', trainer.uid)), "reading another user's private profile");

// ── Trainer can't fake approval, stats or fee counters
await denied(updateDoc(doc(trainer.db, 'trainers', trainer.uid), { rating: 5 }), 'trainer editing own rating');
await denied(updateDoc(doc(trainer.db, 'trainers', trainer.uid), { leadCount: -99 }), 'trainer resetting fee counter');
const pending = await newUser('77');
await denied(setDoc(doc(pending.db, 'trainers', pending.uid), {
  name: 'Sneaky', isKYCApproved: true, kycStatus: 'approved', rating: 0, totalReviews: 0, totalSessions: 0,
}), 'new trainer self-approving');
const pendingTrainer = { name: 'New Coach', isKYCApproved: false, kycStatus: 'pending', rating: 0, totalReviews: 0, totalSessions: 0 };
await denied(setDoc(doc(pending.db, 'trainers', pending.uid), pendingTrainer), 'trainer signing up without an intro video');
await setDoc(doc(pending.db, 'trainers', pending.uid), { ...pendingTrainer, videoIntroUrl: 'https://example.com/intro.mp4' });
ok('trainer signs up with an intro video');
await denied(updateDoc(doc(pending.db, 'trainers', pending.uid), { videoIntroUrl: deleteField() }), 'trainer removing their intro video');

// ── Booking = session + slot lock in one batch (same shape as createBooking())
let hour = 0;
const book = async (who) => {
  const chat = await addDoc(collection(who.db, 'chats'), {
    participants: [who.uid, trainer.uid], participantNames: {}, trainerId: trainer.uid,
    unreadCount: {}, isUnlocked: false, createdAt: serverTimestamp(), lastMessageAt: serverTimestamp(),
  });
  const key = `2099-01-01-${String(hour++).padStart(2, '0')}-${uniq()}`;
  const ref = doc(collection(who.db, 'sessions'));
  const batch = writeBatch(who.db);
  batch.set(ref, {
    clientId: who.uid, trainerId: trainer.uid, clientName: 'Test', trainerName: 'Check Coach',
    type: 'online', status: 'pending', scheduledAt: new Date(Date.now() + 86400000), durationMins: 60,
    slotKey: key, price: 499, chatId: chat.id, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  batch.set(doc(who.db, 'trainers', trainer.uid, 'slots', key), {
    sessionId: ref.id, date: key.slice(0, 10), createdAt: serverTimestamp(),
  });
  await batch.commit();
  return { id: ref.id, key, chatId: chat.id };
};

const first = await book(client);
ok('client booked a slot');
const rival = await newUser('66');
await denied((async () => {
  const b = writeBatch(rival.db);
  const ref = doc(collection(rival.db, 'sessions'));
  b.set(ref, { clientId: rival.uid, trainerId: trainer.uid, status: 'pending', slotKey: first.key, scheduledAt: new Date() });
  b.set(doc(rival.db, 'trainers', trainer.uid, 'slots', first.key), { sessionId: ref.id, date: '2099-01-01', createdAt: serverTimestamp() });
  await b.commit();
})(), 'second client double-booking the same slot');
await denied(deleteDoc(doc(rival.db, 'trainers', trainer.uid, 'slots', first.key)), "client deleting another's slot lock");
await denied(addDoc(collection(client.db, 'sessions'), {
  clientId: client.uid, trainerId: pending.uid, status: 'pending',
}), 'booking an unapproved trainer');

// ── Accepting: only via acceptBooking (fee), never by writing directly
await denied(updateDoc(doc(trainer.db, 'sessions', first.id), { status: 'confirmed', updatedAt: serverTimestamp() }),
  'trainer confirming without the fee check');
await denied(updateDoc(doc(trainer.db, 'chats', first.chatId), { isUnlocked: true }), 'trainer unlocking chat directly');
await denied(addDoc(collection(client.db, 'chats', first.chatId, 'messages'), {
  senderId: client.uid, type: 'text', text: 'hi',
}), 'messaging before trainer accepts');

await denied(getDoc(doc(client.db, 'trainers', trainer.uid, 'private', 'social')), "client reading trainer's socials before booking");
assert.equal((await accept(first.id)).fee, 0);
ok('new client #1 accepted free');
assert.equal((await getDoc(doc(client.db, 'sessions', first.id))).data().trainerSocial?.instagram, 'check.coach');
ok('socials revealed to client only after acceptance');
await addDoc(collection(client.db, 'chats', first.chatId, 'messages'), {
  senderId: client.uid, type: 'text', text: 'See you tomorrow!', read: false, timestamp: serverTimestamp(),
});
ok('chat unlocked by acceptance');
const confirmed = (await getDoc(doc(client.db, 'sessions', first.id))).data();
assert.ok(confirmed.videoCallRoomId, 'online session gets a video room');
ok('online session got a video room');

// Clients #2 and #3 free, #4 must pay
for (const n of [2, 3]) {
  const c = await newUser('55');
  assert.equal((await accept((await book(c)).id)).fee, 0);
  ok(`new client #${n} accepted free`);
}
const fourth = await newUser('44');
const fourthBooking = await book(fourth);
await assert.rejects(accept(fourthBooking.id), (e) => e.message === 'payment-required' && e.details?.fee === 149);
ok('new client #4 blocked until ₹149 is paid');
assert.equal((await accept(fourthBooking.id, 'dev-simulated')).fee, 149);
ok('new client #4 accepted after payment');
assert.equal((await accept((await book(client)).id)).fee, 0);
ok('returning client accepted free');
const t = (await admin.doc(`trainers/${trainer.uid}`).get()).data();
assert.equal(t.leadCount, 4); assert.equal(t.feesPaid, 149);
ok('ledger: 4 clients, ₹149 paid');

// ── Not taking bookings → clients can't request
await updateDoc(doc(trainer.db, 'trainers', trainer.uid), { isAvailableNow: false });
await denied(book(await newUser('33')), 'booking while trainer is not taking bookings');
await updateDoc(doc(trainer.db, 'trainers', trainer.uid), { isAvailableNow: true });

// ── Decline frees the slot
const toDecline = await book(rival);
const b = writeBatch(trainer.db);
b.update(doc(trainer.db, 'sessions', toDecline.id), { status: 'cancelled', cancelReason: 'busy', updatedAt: serverTimestamp() });
b.delete(doc(trainer.db, 'trainers', trainer.uid, 'slots', toDecline.key));
await b.commit();
ok('trainer declined and freed the slot');

// ── Client cancels a pending request → slot is freed for others
const toCancel = await book(client);
const cb = writeBatch(client.db);
cb.update(doc(client.db, 'sessions', toCancel.id), { status: 'cancelled', cancelReason: 'Cancelled by client', updatedAt: serverTimestamp() });
cb.delete(doc(client.db, 'trainers', trainer.uid, 'slots', toCancel.key));
await cb.commit();
ok('client cancelled request and freed the slot');

// ── Complete + review → rating/totals updated by functions
await denied(updateDoc(doc(client.db, 'sessions', first.id), { status: 'completed', clientRating: 5, updatedAt: serverTimestamp() }),
  'completing (and reviewing) before the session time');
await admin.doc(`sessions/${first.id}`).update({ scheduledAt: new Date(Date.now() - 3600e3) }); // session happened
await updateDoc(doc(client.db, 'sessions', first.id), { status: 'completed', clientRating: 4, updatedAt: serverTimestamp() });
await setDoc(doc(client.db, 'reviews', first.id), {
  sessionId: first.id, clientId: client.uid, clientName: 'Test Client', trainerId: trainer.uid,
  rating: 4, comment: 'Great session', createdAt: serverTimestamp(),
});
await denied(setDoc(doc(client.db, 'reviews', first.id), {
  sessionId: first.id, clientId: client.uid, trainerId: trainer.uid, rating: 1,
}), 'overwriting an existing review');
for (let i = 0; i < 20; i++) {
  const s = (await admin.doc(`trainers/${trainer.uid}`).get()).data();
  if (s.totalReviews === 1 && s.totalSessions === 1) break;
  await new Promise((r) => setTimeout(r, 300));
}
const stats = (await admin.doc(`trainers/${trainer.uid}`).get()).data();
assert.equal(stats.rating, 4); assert.equal(stats.totalReviews, 1); assert.equal(stats.totalSessions, 1);
ok('review updated rating (4.0) and session count');

// ── Gym directory
const gymDoc = await addDoc(collection(client.db, 'gyms'), { name: 'Check Gym Baner', area: 'Baner', city: 'Pune', createdBy: client.uid, createdAt: serverTimestamp() });
ok('client added a gym to the directory');
await denied(addDoc(collection(client.db, 'gyms'), { name: 'Fake Gym', area: 'x', city: 'Pune', createdBy: trainer.uid, createdAt: serverTimestamp() }),
  'adding a gym as someone else');
await denied(addDoc(collection(client.db, 'gyms'), { name: 'Call 98765 43210', area: 'x', city: 'Pune', createdBy: client.uid, createdAt: serverTimestamp() }),
  'contact info in a gym name');
await denied(updateDoc(doc(client.db, 'gyms', gymDoc.id), { name: 'Renamed' }), 'editing a gym entry');

// ── Public Q&A: no contact details
const ask = (question) => addDoc(collection(client.db, 'qa'), {
  trainerId: trainer.uid, clientId: client.uid, clientName: 'Test Client', askerRole: 'client',
  question, createdAt: serverTimestamp(),
});
const qa = await ask('Do you train beginners?');
ok('client asked a normal question');
await denied(ask('call me on 98765 43210'), 'phone number in Q&A');
await denied(ask('see instagram.com/me'), 'link / social in Q&A');
await denied(ask('mail me at a@b.co'), 'email in Q&A');
await denied(updateDoc(doc(client.db, 'qa', qa.id), { answer: 'fake answer' }), 'client answering for trainer');
await denied(updateDoc(doc(trainer.db, 'qa', qa.id), { answer: 'WhatsApp me', answeredAt: serverTimestamp() }),
  'trainer sharing contact in answer');
await updateDoc(doc(trainer.db, 'qa', qa.id), { answer: 'Yes!', answeredAt: serverTimestamp() });
ok('trainer answered question');

console.log('\nAll checks passed.');
process.exit(0);
