// Seeds the LOCAL emulator with sample approved trainers (never a real project).
// Usage: `npm run emulators` in one terminal, then `npm run seed`.
// Each trainer can log in from the app with their phone number (any 6-digit code).
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

initializeApp({ projectId: 'demo-bodivex' });
const auth = getAuth();
const db = getFirestore();

// Must match signInWithPhone() in services/auth.ts
const PASSWORD = 'emulator-only-password';
const emailFor = (phone) => `${phone.replace(/\D/g, '')}@phone.bodivex.dev`;

const T = (name, city, gym, specs, exp, online, offline, pref, rating, reviews, sessions, bio) => ({
  name, city, gym, specs, exp, online, offline, pref, rating, reviews, sessions, bio,
});

// Placeholder portraits for local testing only (randomuser.me); real trainers upload their own.
const PHOTOS = ['men/32', 'women/44', 'men/75', 'women/68', 'men/52', 'women/21', 'men/11', 'women/90', 'men/85'];

const TRAINERS = [
  T('Arjun Sharma', 'Mumbai', "Gold's Gym Bandra", ['Weight Loss', 'Strength Training', 'Bodybuilding'], 6, 499, 899, 'both', 4.9, 148, 520,
    'ACE certified coach focused on fat loss and strength. 300+ clients coached across Mumbai.'),
  T('Priya Desai', 'Mumbai', 'Cult Andheri West', ['HIIT', 'Flexibility & Mobility', 'Pre/Post Natal'], 5, 399, 799, 'both', 4.8, 96, 340,
    'Functional training and posture specialist. Helping women build strength without crash diets.'),
  T('Rohan Kulkarni', 'Pune', 'Anytime Fitness Baner', ['Muscle Gain', 'Strength Training'], 4, 449, 749, 'offline', 4.7, 61, 210,
    'Powerlifting-style strength programs for beginners and intermediates.'),
  T('Sneha Joshi', 'Pune', 'Online', ['Yoga', 'Flexibility & Mobility'], 7, 349, undefined, 'online', 4.9, 132, 610,
    'Yoga and mobility coach. Live online sessions for back pain and stiffness.'),
  T('Imran Shaikh', 'Thane', 'Talwalkars Thane West', ['Weight Loss', 'Cardio', 'HIIT'], 3, 299, 599, 'both', 4.6, 38, 120,
    'Practical fat-loss plans with Indian home-food diets.'),
  T('Kavya Nair', 'Navi Mumbai', 'Snap Fitness Vashi', ['Functional Training', 'CrossFit'], 5, 499, 849, 'both', 4.8, 74, 280,
    'CrossFit L1 coach. Conditioning, mobility and real-world strength.'),
  T('Aditya Patil', 'Nagpur', 'Fitness First Dharampeth', ['Muscle Gain', 'Bodybuilding', 'Nutrition Coaching'], 8, 399, 699, 'both', 4.7, 88, 450,
    'Competitive bodybuilder and nutrition coach. Lean bulking done right.'),
  T('Meera Deshmukh', 'Nashik', 'Online', ['Senior Fitness', 'Flexibility & Mobility'], 6, 299, undefined, 'online', 4.8, 45, 190,
    'Gentle strength and balance training for 50+ adults.'),
  T('Siddharth Rao', 'Chh. Sambhajinagar', 'Gym One CIDCO', ['Sports Performance', 'Calisthenics'], 4, 349, 599, 'offline', 4.5, 22, 90,
    'Athletic conditioning and bodyweight skills for students and athletes.'),
];

// Gym directory (deterministic ids so re-seeding doesn't duplicate). Area = locality.
const GYMS = [
  ["Gold's Gym Bandra", 'Bandra West', 'Mumbai'], ['Cult Andheri West', 'Andheri West', 'Mumbai'],
  ['Anytime Fitness Baner', 'Baner', 'Pune'], ['Cult Kothrud', 'Kothrud', 'Pune'],
  ['Talwalkars Thane West', 'Thane West', 'Thane'], ['Snap Fitness Vashi', 'Vashi', 'Navi Mumbai'],
  ['Fitness First Dharampeth', 'Dharampeth', 'Nagpur'], ['Gym One CIDCO', 'CIDCO', 'Chh. Sambhajinagar'],
  ['Powerhouse Gym Nashik Road', 'Nashik Road', 'Nashik'],
];
const gymId = (name) => 'seed-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
const gymRef = {};
for (const [name, area, city] of GYMS) {
  await db.doc(`gyms/${gymId(name)}`).set({ name, area, city, createdBy: 'seed', createdAt: FieldValue.serverTimestamp() });
  gymRef[name] = { id: gymId(name), name, area };
}

// Where in-person trainers can train (some also go to homes / societies or outdoors)
const PLACES = { 0: ['gym', 'home'], 2: ['gym'], 4: ['gym', 'home', 'outdoor'], 5: ['gym'], 6: ['gym'], 8: ['gym', 'outdoor'], 1: ['gym', 'home'] };

for (const [i, t] of TRAINERS.entries()) {
  const phone = `+91900000${String(i + 1).padStart(4, '0')}`;
  const email = emailFor(phone);
  let uid;
  try {
    uid = (await auth.getUserByEmail(email)).uid;
  } catch {
    uid = (await auth.createUser({ email, password: PASSWORD })).uid;
  }

  await db.doc(`users/${uid}`).set({
    phone, name: t.name, role: 'trainer', kycStatus: 'approved', aadhaarVerified: false,
    createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
  });

  const trainer = {
    userId: uid,
    name: t.name,
    bio: t.bio,
    profilePhoto: `https://randomuser.me/api/portraits/${PHOTOS[i]}.jpg`,
    city: t.city,
    state: 'Maharashtra',
    specializations: t.specs,
    certifications: [{ name: 'Certified Personal Trainer', issuedBy: 'ACE', year: 2020, verified: true }],
    medals: i === 0
      ? [
          { title: 'Mumbai Powerlifting Open', description: 'Silver, 83 kg', year: 2023, kind: 'competition' },
          { title: "Mr. Maharashtra Men's Physique", description: 'Gold', year: 2022, kind: 'competition' },
          { title: 'Coached 300+ clients', year: 2024, kind: 'achievement' },
        ]
      : i === 6
      ? [{ title: 'Nagpur Classic Bodybuilding', description: '1st place', year: 2021, kind: 'competition' }]
      : [],
    experience: t.exp,
    pricingOnline: t.online,
    pricingOffline: t.offline,
    sessionPreference: t.pref,
    languages: ['English', 'Hindi', 'Marathi'],
    coachesLevels: i === 0 || i === 6 ? ['enthusiast', 'competitive', 'pro'] : ['enthusiast'],
    federations: i === 0 ? ['IFBB Pro', 'NPC'] : i === 6 ? ['IFBB'] : [],
    // Note: public sample clip (not a real 30–60s intro) so the profile hero has something to play
    ...(i === 0 && { videoIntroUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4' }),
    ...(t.gym !== 'Online' && {
      gyms: [gymRef[t.gym]],
      gymIds: [gymRef[t.gym].id],
      inPersonPlaces: PLACES[i] ?? ['gym'],
    }),
    rating: t.rating,
    totalReviews: t.reviews,
    totalSessions: t.sessions,
    isKYCApproved: true,
    kycStatus: 'approved',
    isAvailableNow: true,
    availabilityStatus: 'available_now',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await db.doc(`trainers/${uid}`).set(JSON.parse(JSON.stringify(trainer)), { merge: false });
  if (i === 0) await db.doc(`trainers/${uid}/private/social`).set({ instagram: 'arjun.fitness', youtube: 'arjuntrains' });

  if (i === 0) {
    await db.collection('qa').add({
      trainerId: uid, clientId: 'seed', clientName: 'Aakash V.', askerRole: 'client',
      question: 'Do you make vegetarian high-protein diet plans?',
      answer: 'Yes, most of my clients are vegetarian: paneer, dal, soya, curd and whey.',
      createdAt: FieldValue.serverTimestamp(), answeredAt: FieldValue.serverTimestamp(),
    });
  }
  console.log(`✓ ${t.name.padEnd(18)} ${t.city.padEnd(20)} login: ${phone}`);
}

console.log('\nDone. Log in as a client with any other number.');
process.exit(0);
