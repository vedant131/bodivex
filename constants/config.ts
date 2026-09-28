// Launch cities: Maharashtra metros
export const CITIES = [
  'Mumbai',
  'Thane',
  'Navi Mumbai',
  'Pune',
  'Nagpur',
  'Nashik',
  'Chh. Sambhajinagar',
] as const;
export type City = typeof CITIES[number];

// Public Q&A must not carry contact details (keep in sync with firestore.rules noContactInfo)
export const CONTACT_INFO_PATTERN =
  /(https?:\/\/|www\.|wa\.me|t\.me|instagram|insta\b|whatsapp|telegram|[0-9][0-9 ()+.-]{7,}[0-9]|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|@[a-z0-9_.]{3,})/i;
export const CONTACT_INFO_MESSAGE =
  'Please keep Q&A on Bodivex: phone numbers, links, emails and social handles are not allowed. Book a session to chat privately.';

export const CONFIG = {
  appName: 'Bodivex',
  tagline: 'Find. Train. Transform.',
  website: 'https://bodivex.in',
  supportEmail: 'support@bodivex.in',

  // Business rules
  // Monetization: trainers pay once per new client they accept (not per session)
  newClientFee: 149,
  freeClientsPerTrainer: 3,
  trainerApprovalHours: 48,
  freeIntroMinutes: 15,
  maxVideoIntroSeconds: 60,
  sessionBookingWindowMins: 30, // trainer must accept within 30 mins

  // Slot booking (Urban Company style): 1-hour slots, next 7 days
  slots: {
    firstHour: 6,       // 6 AM
    lastHour: 20,       // last slot starts 8 PM
    sessionMins: 60,
    daysAhead: 7,
    minLeadMins: 60,    // can't book a slot starting within the next hour
  },

  // Firebase — `demo-` project id works only with the local emulator.
  // Replace with the real config from the Firebase Console before launch.
  firebase: {
    apiKey: 'demo-api-key',
    authDomain: 'demo-bodivex.firebaseapp.com',
    projectId: 'demo-bodivex',
    storageBucket: 'demo-bodivex.appspot.com',
    appId: 'demo-app-id',
  },

  // Agora — replace with your Agora App ID
  agora: {
    appId: 'YOUR_AGORA_APP_ID',
  },

  // Algolia — replace with your Algolia credentials
  algolia: {
    appId: 'YOUR_ALGOLIA_APP_ID',
    searchApiKey: 'YOUR_ALGOLIA_SEARCH_KEY',
    trainersIndex: 'bodivex_trainers',
  },

  // Google Maps
  googleMaps: {
    apiKey: 'YOUR_GOOGLE_MAPS_API_KEY',
  },

} as const;
