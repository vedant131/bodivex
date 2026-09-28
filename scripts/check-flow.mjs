// End-to-end check of the booking flow + security rules against the LOCAL emulator.
// Usage: `npm run emulators`, `npm run seed`, then `npm run check`.
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, addDoc, updateDoc, getDocs,
  collection, query, where, serverTimestamp, setLogLevel,
} from 'firebase/firestore';

setLogLevel('silent'); // expected permission-denied errors are asserted below

const PASSWORD = 'emulator-only-password';
const emailFor = (phone) => `${phone.replace(/\D/g, '')}@phone.bodivex.dev`;

// One Firebase app per signed-in person, like two separate phones.
async function as(phone, { create = false } = {}) {
  const app = initializeApp({ apiKey: 'demo', projectId: 'demo-bodivex' }, phone + Math.random());
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  const cred = create
    ? await createUserWithEmailAndPassword(auth, emailFor(phone), PASSWORD)
    : await signInWithEmailAndPassword(auth, emailFor(phone), PASSWORD);
  return { app, db, uid: cred.user.uid };
}

const denied = async (promise, label) => {
  await assert.rejects(promise, (e) => e.code === 'permission-denied', `should be denied: ${label}`);
  console.log(`  ✓ blocked: ${label}`);
};
const ok = (label) => console.log(`  ✓ ${label}`);

const clientPhone = `+9188${Date.now().toString().slice(-8)}`;
const client = await as(clientPhone, { create: true });
const trainer = await as('+919000000001'); // seeded: Arjun Sharma, Mumbai

// ── Client signs up
await setDoc(doc(client.db, 'users', client.uid), {
  phone: clientPhone, name: 'Test Client', role: 'client', kycStatus: 'not_started', aadhaarVerified: false,
  createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
});
await setDoc(doc(client.db, 'clients', client.uid), { name: 'Test Client', city: 'Mumbai', userId: client.uid });
ok('client signed up');
await denied(updateDoc(doc(client.db, 'users', client.uid), { role: 'trainer' }), 'client changing own role');

// ── Discovery: only approved trainers, by city
const mumbai = await getDocs(query(collection(client.db, 'trainers'),
  where('isKYCApproved', '==', true), where('city', '==', 'Mumbai')));
assert.ok(mumbai.size >= 2, 'expected seeded Mumbai trainers');
ok(`found ${mumbai.size} Mumbai trainers`);
await denied(getDoc(doc(client.db, 'clients', trainer.uid)), "reading another user's private profile");

// ── Trainer cannot approve themselves or fake stats
await denied(updateDoc(doc(trainer.db, 'trainers', trainer.uid), { rating: 5 }), 'trainer editing own rating');
const pendingPhone = `+9177${Date.now().toString().slice(-8)}`;
const newTrainer = await as(pendingPhone, { create: true });
await denied(setDoc(doc(newTrainer.db, 'trainers', newTrainer.uid), {
  name: 'Sneaky', isKYCApproved: true, kycStatus: 'approved', rating: 0, totalReviews: 0, totalSessions: 0,
}), 'new trainer self-approving');

// ── Booking request
const chatRef = await addDoc(collection(client.db, 'chats'), {
  participants: [client.uid, trainer.uid], participantNames: {}, trainerId: trainer.uid,
  unreadCount: { [client.uid]: 0, [trainer.uid]: 0 }, isUnlocked: false,
  createdAt: serverTimestamp(), lastMessageAt: serverTimestamp(),
});
const sessionRef = await addDoc(collection(client.db, 'sessions'), {
  clientId: client.uid, trainerId: trainer.uid, clientName: 'Test Client', trainerName: 'Arjun Sharma',
  type: 'online', status: 'pending', scheduledAt: new Date(Date.now() + 86400000), durationMins: 60,
  price: 499, chatId: chatRef.id, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
});
ok('client sent booking request');
await denied(addDoc(collection(client.db, 'sessions'), {
  clientId: client.uid, trainerId: newTrainer.uid, status: 'pending',
}), 'booking an unapproved trainer');
await denied(addDoc(collection(client.db, 'chats', chatRef.id, 'messages'), {
  senderId: client.uid, type: 'text', text: 'hi',
}), 'messaging before trainer accepts');
await denied(updateDoc(doc(client.db, 'chats', chatRef.id), { isUnlocked: true }), 'client unlocking chat');
await denied(updateDoc(sessionRef, { status: 'confirmed' }), 'client confirming own booking');

// ── Trainer accepts → chat unlocks
await updateDoc(doc(trainer.db, 'sessions', sessionRef.id), { status: 'confirmed', updatedAt: serverTimestamp() });
await updateDoc(doc(trainer.db, 'chats', chatRef.id), { isUnlocked: true });
ok('trainer accepted, chat unlocked');
await addDoc(collection(client.db, 'chats', chatRef.id, 'messages'), {
  senderId: client.uid, type: 'text', text: 'See you tomorrow!', read: false, timestamp: serverTimestamp(),
});
ok('client messaged trainer');
await denied(updateDoc(doc(trainer.db, 'sessions', sessionRef.id), { price: 1 }), 'trainer changing agreed price');

// ── Client completes + reviews (once)
await updateDoc(sessionRef, { status: 'completed', clientRating: 5, updatedAt: serverTimestamp() });
await setDoc(doc(client.db, 'reviews', sessionRef.id), {
  sessionId: sessionRef.id, clientId: client.uid, clientName: 'Test Client', trainerId: trainer.uid,
  rating: 5, comment: 'Great session', createdAt: serverTimestamp(),
});
ok('client completed session and left review');
await denied(setDoc(doc(client.db, 'reviews', sessionRef.id), {
  sessionId: sessionRef.id, clientId: client.uid, trainerId: trainer.uid, rating: 1,
}), 'overwriting an existing review');

// ── Public Q&A
const qa = await addDoc(collection(client.db, 'qa'), {
  trainerId: trainer.uid, clientId: client.uid, clientName: 'Test Client', askerRole: 'client',
  question: 'Do you train beginners?', createdAt: serverTimestamp(),
});
await denied(updateDoc(doc(client.db, 'qa', qa.id), { answer: 'fake answer' }), 'client answering for trainer');
await updateDoc(doc(trainer.db, 'qa', qa.id), { answer: 'Yes!', answeredAt: serverTimestamp() });
ok('trainer answered question');

await Promise.all([client, trainer, newTrainer].map((p) => deleteApp(p.app)));
console.log('\nAll checks passed.');
process.exit(0);
