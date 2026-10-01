// Seeds sample approved trainers + gyms. Defaults to the LOCAL stack (`npm run db:start`).
// For a hosted test project: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npm run seed
// Each trainer can log in from the app with their phone number (any 6-digit code).
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// Well-known keys of every local Supabase stack (not secrets).
const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const admin = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });

const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

// Friends-only test deployment: let trainers "pay" the new-client fee with a test payment.
if (process.env.ALLOW_TEST_PAYMENTS === 'true') {
  must(await admin.from('app_settings').upsert({ key: 'allow_test_payments', value: 'true' }));
  console.log('✓ test payments enabled');
}

// Must match signInWithPhone() in services/auth.ts
const PASSWORD = 'dev-only-password';
const emailFor = (phone) => `${phone.replace(/\D/g, '')}@phone.bodivex.dev`;

const T = (name, city, gym, specs, exp, online, offline, pref, rating, reviews, sessions, bio) => ({
  name, city, gym, specs, exp, online, offline, pref, rating, reviews, sessions, bio,
});

// Placeholder portraits for local testing only (randomuser.me); real trainers upload their own.
const PHOTOS = ['men/32', 'women/44', 'men/75', 'women/68', 'men/52', 'women/21', 'men/11', 'women/90', 'men/85'];
// Our own 30s sample clip (in our storage, no third-party host) so every profile hero plays
must(await admin.storage.from('media').upload('seed/sample-intro.mp4',
  readFileSync(new globalThis.URL('../supabase/seed-media/sample-intro.mp4', import.meta.url)),
  { contentType: 'video/mp4', upsert: true }));
const SAMPLE_CLIP = admin.storage.from('media').getPublicUrl('seed/sample-intro.mp4').data.publicUrl;

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
const gymRef = Object.fromEntries(GYMS.map(([name, area]) => [name, { id: gymId(name), name, area }]));
must(await admin.from('gyms').upsert(GYMS.map(([name, area, city]) => ({ id: gymId(name), name, area, city }))));

// Where in-person trainers can train (some also go to homes / societies or outdoors)
const PLACES = { 0: ['gym', 'home'], 2: ['gym'], 4: ['gym', 'home', 'outdoor'], 5: ['gym'], 6: ['gym'], 8: ['gym', 'outdoor'], 1: ['gym', 'home'] };

// Existing seeded accounts (re-running is safe)
const existing = new Map(must(await admin.auth.admin.listUsers({ perPage: 1000 })).users.map((u) => [u.email, u.id]));

for (const [i, t] of TRAINERS.entries()) {
  const phone = `+91900000${String(i + 1).padStart(4, '0')}`;
  const email = emailFor(phone);
  const uid = existing.get(email) ??
    must(await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true })).user.id;

  must(await admin.from('users').upsert({ id: uid, phone, name: t.name, role: 'trainer', kyc_status: 'approved' }));
  must(await admin.from('trainers').upsert({
    id: uid,
    user_id: uid,
    name: t.name,
    bio: t.bio,
    profile_photo: `https://randomuser.me/api/portraits/${PHOTOS[i]}.jpg`,
    video_intro_url: SAMPLE_CLIP,
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
    pricing_online: t.online ?? null,
    pricing_offline: t.offline ?? null,
    session_preference: t.pref,
    languages: ['English', 'Hindi', 'Marathi'],
    coaches_levels: i === 0 || i === 6 ? ['enthusiast', 'competitive', 'pro'] : ['enthusiast'],
    federations: i === 0 ? ['IFBB Pro', 'NPC'] : i === 6 ? ['IFBB'] : [],
    gyms: t.gym !== 'Online' ? [gymRef[t.gym]] : [],
    gym_ids: t.gym !== 'Online' ? [gymRef[t.gym].id] : [],
    in_person_places: t.gym !== 'Online' ? PLACES[i] ?? ['gym'] : null,
    rating: t.rating,
    total_reviews: t.reviews,
    total_sessions: t.sessions,
    is_kyc_approved: true,
    kyc_status: 'approved',
    is_available_now: true,
    availability_status: 'available_now',
  }));

  if (i === 0) {
    must(await admin.from('trainer_private').upsert({ trainer_id: uid, instagram: 'arjun.fitness', youtube: 'arjuntrains' }));
    const hasQa = must(await admin.from('qa').select('id').eq('trainer_id', uid).limit(1)).length;
    if (!hasQa) must(await admin.from('qa').insert({
      trainer_id: uid, client_id: '00000000-0000-0000-0000-000000000000', client_name: 'Aakash V.', asker_role: 'client',
      question: 'Do you make vegetarian high-protein diet plans?',
      answer: 'Yes, most of my clients are vegetarian: paneer, dal, soya, curd and whey.',
      answered_at: new Date().toISOString(),
    }));
  }
  console.log(`✓ ${t.name.padEnd(18)} ${t.city.padEnd(20)} login: ${phone}`);
}

console.log('\nDone. Log in as a client with any other number.');
