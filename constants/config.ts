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

  // Gemini AI — dev only. Before launch this call moves to a Cloud Function,
  // because anything in the app bundle can be extracted.
  gemini: {
    apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '',
  },
} as const;
