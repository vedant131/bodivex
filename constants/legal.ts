import { CONFIG } from './config';

/**
 * Privacy Policy and Terms of Use shown in the app. Written to match what the app actually
 * does (see supabase/migrations for who can read what). Have a lawyer review before launch.
 */
export type LegalDoc = { title: string; updated: string; sections: { heading: string; body: string[] }[] };

const contact = `${CONFIG.supportEmail}`;

export const PRIVACY: LegalDoc = {
  title: 'Privacy Policy',
  updated: '7 October 2026',
  sections: [
    { heading: 'Who we are', body: [
      `Bodivex is an app that connects people with personal fitness coaches in Maharashtra, India. If you have any question about your data, write to ${contact}.`,
    ] },
    { heading: 'What we collect', body: [
      'Account: your phone number, name and whether you joined as a client or a coach.',
      'Client profile: age, gender, height, weight, fitness level, goals, city, gym, budget, athlete details and your fitness plan.',
      'Coach profile: photo, bio, city, experience, specialisations, certificates, competitions, prices, gyms, intro video and any social media handles you add.',
      'Bookings: session times, online or in-person, place, price, status, ratings and reviews.',
      'Chats: the messages and photos you send to the coach or client you booked with.',
      'Public questions and answers on coach profiles, and before/after results that coaches upload with their client\'s consent.',
      'We do not collect your GPS location, your contacts or your card details.',
    ] },
    { heading: 'How we use it', body: [
      'To show coach profiles, match clients with suitable coaches, run bookings, chat and video calls, and keep the fee records for coaches.',
      'To verify coaches before they appear to clients, and to keep the platform safe, for example by blocking phone numbers and links in public questions.',
      'We do not sell your data and we do not show ads.',
    ] },
    { heading: 'Who can see what', body: [
      'Approved coach profiles are visible to signed-in users. A coach is hidden until our team approves them.',
      'A coach sees a client\'s name and booking details only when that client sends them a request.',
      'A coach\'s social media handles are shown to a client only after the coach accepts their booking.',
      'Chats are visible only to the two people in them. Reviews and public questions are visible inside the app.',
    ] },
    { heading: 'Where your data is kept', body: [
      'Your data is stored with Supabase in its Mumbai (India) region and is encrypted while it travels. App updates are delivered through Expo.',
      'Online sessions use Jitsi Meet, which opens outside Bodivex and follows Jitsi\'s own privacy policy.',
    ] },
    { heading: 'How long we keep it', body: [
      'We keep your data while your account exists. When you delete your account, your profile, photos, videos, bookings, chats and reviews are deleted.',
      'If you were a client, a coach may keep a fee receipt for accepting you, with your name removed. Public questions you asked stay, shown as "Deleted user".',
    ] },
    { heading: 'Your rights', body: [
      'Under India\'s Digital Personal Data Protection Act, 2023, you can see and correct your data (Edit profile), delete your account (Profile → Delete account), withdraw your consent, and raise a grievance.',
      `Grievances: write to ${contact}. We reply within 30 days.`,
    ] },
    { heading: 'Age and health', body: [
      'Bodivex is for people aged 18 and over.',
      'Fitness details are used only to match you with coaches. They are not medical advice.',
    ] },
    { heading: 'Changes', body: [
      'If we change this policy, we will update the date above and tell you in the app about important changes.',
    ] },
  ],
};

export const TERMS: LegalDoc = {
  title: 'Terms of Use',
  updated: '7 October 2026',
  sections: [
    { heading: 'Using Bodivex', body: [
      'You must be 18 or older. One account per phone number. Keep your login to yourself; you are responsible for what happens in your account.',
    ] },
    { heading: 'What Bodivex is', body: [
      'Bodivex is a platform that helps clients find and book independent fitness coaches. Coaches are not Bodivex employees.',
      'We check coaches\' identity and certificates before approving them, but we cannot guarantee results from any coaching.',
    ] },
    { heading: 'Bookings and payments', body: [
      'Clients pay their coach directly for sessions. A coach can accept or decline a request, and a client can cancel a request before it is accepted.',
      `Coaches can list for free. When a coach accepts a new client, they pay Bodivex a one-time fee of ₹${CONFIG.newClientFee}. A coach's first ${CONFIG.freeClientsPerTrainer} new clients are free, and returning clients are always free. The fee is shown before you pay.`,
    ] },
    { heading: 'Your health', body: [
      'Talk to a doctor before starting a new exercise or diet plan, especially if you have a medical condition, an injury or are pregnant.',
      'Plans and suggestions in the app are general guidance, not medical advice. Train within your limits and stop if something hurts.',
    ] },
    { heading: 'Rules for everyone', body: [
      'Be respectful. No harassment, hate, nudity or fake reviews.',
      'Do not share phone numbers, links or social handles in public questions; use the private chat after a booking is accepted.',
      'Coaches must use their real identity and qualifications.',
    ] },
    { heading: 'Your content', body: [
      'You own what you post (photos, videos, reviews, messages). You allow Bodivex to show it inside the app to run the service. We may remove content that breaks these rules.',
    ] },
    { heading: 'Ending your account', body: [
      'You can delete your account at any time from Profile → Delete account. We may suspend accounts that break these terms.',
    ] },
    { heading: 'Liability', body: [
      'Bodivex provides the platform "as is". To the extent the law allows, Bodivex is not responsible for injuries, losses or disputes arising from sessions between clients and coaches.',
    ] },
    { heading: 'Law and contact', body: [
      `These terms follow the laws of India, and courts in Mumbai, Maharashtra have jurisdiction. Questions: ${contact}.`,
    ] },
  ],
};
