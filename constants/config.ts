export const CONFIG = {
  appName: 'Bodivex',
  tagline: 'Find. Train. Transform.',
  website: 'https://bodivex.in',
  supportEmail: 'support@bodivex.in',

  // Business rules
  platformFeePercent: 5,
  autoReleaseHours: 48,
  minWithdrawalAmount: 500,
  trainerApprovalHours: 48,
  freeIntroMinutes: 15,
  maxVideoIntroSeconds: 60,
  sessionBookingWindowMins: 30, // trainer must accept within 30 mins

  // Firebase — replace with your actual config from Firebase Console
  firebase: {
    apiKey: 'YOUR_FIREBASE_API_KEY',
    authDomain: 'bodivex-app.firebaseapp.com',
    projectId: 'bodivex-app',
    storageBucket: 'bodivex-app.appspot.com',
    messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
    appId: 'YOUR_APP_ID',
    measurementId: 'YOUR_MEASUREMENT_ID',
  },

  // Razorpay — replace with your actual key from Razorpay Dashboard
  razorpay: {
    keyId: 'YOUR_RAZORPAY_KEY_ID',
    keySecret: 'YOUR_RAZORPAY_KEY_SECRET', // keep server-side only
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

  // Gemini AI
  gemini: {
    apiKey: 'YOUR_GEMINI_API_KEY',
  },
} as const;
