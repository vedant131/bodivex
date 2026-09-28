import { SessionPreference, AthleteLevel } from './user';

export type AvailabilityStatus = 'available_now' | 'busy' | 'offline';

export interface Certification {
  name: string;
  issuedBy: string;
  year: number;
  documentUrl?: string;
  verified: boolean;
}

export interface Medal {
  title: string;
  year: number;
  description?: string;
  /** Older entries have no kind; treat them as achievements */
  kind?: 'competition' | 'achievement';
}

export interface GymLocation {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
}

export interface TrainerProfile {
  id: string;
  userId: string;
  name: string;
  bio: string;
  profilePhoto?: string;
  videoIntroUrl?: string;
  specializations: string[];
  certifications: Certification[];
  medals: Medal[];
  experience: number; // years
  pricingOnline?: number; // per session in INR
  pricingOffline?: number;
  pricingMonthly?: number;
  gymLocation?: GymLocation;
  sessionPreference: SessionPreference;
  isAvailableNow: boolean;      // "Taking bookings" switch; off = clients can't request
  leadCount?: number;           // distinct clients accepted (server-managed)
  feesPaid?: number;            // total new-client fees paid (server-managed)
  availabilityStatus: AvailabilityStatus;
  rating: number;
  totalReviews: number;
  totalSessions: number;
  isKYCApproved: boolean;
  kycStatus: 'not_started' | 'pending' | 'under_review' | 'approved' | 'rejected';
  languages: string[];
  coachesLevels?: AthleteLevel[]; // who they coach; missing = enthusiasts
  federations?: string[];         // federations they've prepped athletes for
  city: string;
  state: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transformation {
  id: string;
  trainerId: string;
  beforePhotoUrl: string;
  afterPhotoUrl: string;
  aiVerified: boolean;
  aiScore?: number; // 0-100
  aiFlags?: string[];
  clientConsentGiven: boolean;
  caption?: string;
  weightLostKg?: number;
  durationWeeks?: number;
  createdAt: Date;
}

export interface TrainerFilter {
  specializations?: string[];
  maxPrice?: number;
  minRating?: number;
  sessionPreference?: SessionPreference;
  isAvailableNow?: boolean;
  language?: string;
  city?: string;
  gymName?: string;
  budgetRange?: string;
  searchQuery?: string;
  /** Only coaches who train this level (competitive / pro athletes) */
  athleteLevel?: 'competitive' | 'pro';
}

export interface TrainerReview {
  id: string;
  sessionId: string;
  clientId: string;
  clientName: string;
  clientPhoto?: string;
  trainerId: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

export interface TrainerQA {
  id: string;
  trainerId: string;
  clientId: string;
  clientName: string;
  askerRole?: 'client' | 'trainer';
  askerPhoto?: string;
  question: string;
  answer?: string;
  answeredAt?: Date;
  createdAt: Date;
}

export const SPECIALIZATIONS = [
  'Weight Loss',
  'Muscle Gain',
  'HIIT',
  'Strength Training',
  'Cardio',
  'Yoga',
  'Functional Training',
  'Sports Performance',
  'Bodybuilding',
  'Nutrition Coaching',
  'Flexibility & Mobility',
  'Pre/Post Natal',
  'Senior Fitness',
  'CrossFit',
  'Calisthenics',
  'Contest Prep',
  'Posing',
  'Powerlifting',
] as const;

/** Trainer socials are private: stored at trainers/{uid}/private/social and copied onto a
 *  session only when the trainer accepts it (keeps first contact inside Bodivex). */
export interface TrainerSocial {
  instagram?: string;
  youtube?: string;
}

export type Specialization = typeof SPECIALIZATIONS[number];
