// Bodivex Cloud Functions. Runs locally in the Firebase emulator (`npm run emulators`);
// deploy needs the Blaze plan. Anything that moves money or trainer stats lives here,
// because clients can't be trusted to write it (see firestore.rules).
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { randomBytes } = require('node:crypto');

initializeApp();
const db = getFirestore();

// Keep in sync with constants/config.ts
const NEW_CLIENT_FEE = 149;
const FREE_CLIENTS = 3;
const IS_EMULATOR = process.env.FUNCTIONS_EMULATOR === 'true';

// ─── Accept a booking (charges the new-client fee when due) ───────────────────

/**
 * Trainer accepts a pending booking. First FREE_CLIENTS distinct clients are free;
 * after that each NEW client costs NEW_CLIENT_FEE (returning clients are free).
 * Only after this succeeds is the session confirmed and the chat unlocked.
 *
 * data: { sessionId, payment?: 'dev-simulated' }
 * Note: payment is simulated in the emulator only; verify a Razorpay payment id here at launch.
 */
exports.acceptBooking = onCall(async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in first.');
  const sessionId = req.data?.sessionId;
  if (typeof sessionId !== 'string') throw new HttpsError('invalid-argument', 'sessionId required.');

  const sessionRef = db.doc(`sessions/${sessionId}`);
  const trainerRef = db.doc(`trainers/${uid}`);

  return db.runTransaction(async (tx) => {
    const [sessionSnap, trainerSnap] = await Promise.all([tx.get(sessionRef), tx.get(trainerRef)]);
    const s = sessionSnap.data();
    if (!s || s.trainerId !== uid) throw new HttpsError('not-found', 'Booking not found.');
    if (s.status !== 'pending') throw new HttpsError('failed-precondition', 'This request was already handled.');
    if (s.scheduledAt.toDate() < new Date()) throw new HttpsError('failed-precondition', 'This request has expired.');
    const trainer = trainerSnap.data();
    if (!trainer?.isKYCApproved) throw new HttpsError('permission-denied', 'Your profile is not approved yet.');

    const leadRef = trainerRef.collection('leads').doc(s.clientId);
    const [leadSnap, socialSnap] = await Promise.all([tx.get(leadRef), tx.get(trainerRef.collection('private').doc('social'))]);
    const social = socialSnap.data();
    const isNewClient = !leadSnap.exists;
    const fee = isNewClient && (trainer.leadCount ?? 0) >= FREE_CLIENTS ? NEW_CLIENT_FEE : 0;

    let paymentRef = null;
    if (fee > 0) {
      if (req.data?.payment === 'dev-simulated' && IS_EMULATOR) {
        paymentRef = `dev_${Date.now()}`;
      } else {
        throw new HttpsError('failed-precondition', 'payment-required', { fee });
      }
    }

    if (isNewClient) {
      tx.set(leadRef, {
        clientId: s.clientId,
        clientName: s.clientName,
        firstSessionId: sessionId,
        fee,
        paymentRef,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.update(trainerRef, {
        leadCount: FieldValue.increment(1),
        feesPaid: FieldValue.increment(fee),
      });
    }

    tx.update(sessionRef, {
      status: 'confirmed',
      confirmedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      // Note: free Jitsi room until Agora (needs a dev build) replaces it
      ...(s.type === 'online' && { videoCallRoomId: `bodivex-${randomBytes(9).toString('hex')}` }),
      // Socials are revealed only now that the client is booked in
      ...(social && (social.instagram || social.youtube) && { trainerSocial: social }),
    });
    if (s.chatId) tx.update(db.doc(`chats/${s.chatId}`), { isUnlocked: true });

    return { fee, confirmed: true };
  });
});

// ─── Trainer stats (clients can't write these) ────────────────────────────────

exports.onReviewCreated = onDocumentCreated('reviews/{reviewId}', async (event) => {
  const review = event.data?.data();
  if (!review?.trainerId || typeof review.rating !== 'number') return;
  const trainerRef = db.doc(`trainers/${review.trainerId}`);
  await db.runTransaction(async (tx) => {
    const t = (await tx.get(trainerRef)).data();
    if (!t) return;
    const n = t.totalReviews ?? 0;
    const avg = ((t.rating ?? 0) * n + review.rating) / (n + 1);
    tx.update(trainerRef, { rating: Math.round(avg * 10) / 10, totalReviews: n + 1 });
  });
});

exports.onSessionCompleted = onDocumentUpdated('sessions/{sessionId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (before?.status === 'completed' || after?.status !== 'completed') return;
  await db.doc(`trainers/${after.trainerId}`).update({ totalSessions: FieldValue.increment(1) });
});

// ─── AI Fitness Blueprint (keeps the Gemini key off the phone) ────────────────

exports.generateBlueprint = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  const key = process.env.GEMINI_API_KEY; // functions/.env.local (never committed)
  if (!key) return { blueprint: null }; // app falls back to its built-in blueprint

  const { age, gender, weight, height, fitnessLevel, goals } = req.data ?? {};
  const prompt = `You are a fitness advisor for an Indian personal-trainer marketplace.
User: age ${Number(age)}, ${String(gender)}, ${Number(weight)}kg, ${Number(height)}cm, level ${String(fitnessLevel)}.
Goals: ${(Array.isArray(goals) ? goals : []).map(String).join(', ')}.
Return ONLY JSON: {"trainerType": string, "recommendedStyle": string, "estimatedTimeline": string,
"additionalNotes": string, "recommendedFilters": {"specializations": string[], "sessionPreference": "online"|"offline"|"both", "minExperience": number}}`;

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
        }),
        signal: AbortSignal.timeout(15_000),
      }
    );
    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    return { blueprint: text ? JSON.parse(text) : null };
  } catch (e) {
    console.warn('Gemini failed, client will use fallback', e.message);
    return { blueprint: null };
  }
});
