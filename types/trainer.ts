import { SessionPreference } from './user';

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
  isAvailableNow: boolean;
  availabilityStatus: AvailabilityStatus;
  rating: number;
  totalReviews: number;
  totalSessions: number;
  isKYCApproved: boolean;
  kycStatus: 'not_started' | 'pending' | 'under_review' | 'approved' | 'rejected';
  bankAccountVerified: boolean;
  razorpayLinkedAccountId?: string;
  languages: string[];
  city: string;
  state: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrainerRateHistory {
  id: string;
  trainerId: string;
  pricingOnline?: number;
  pricingOffline?: number;
  pricingMonthly?: number;
  effectiveFrom: Date;
  reason?: string;
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
] as const;

export type Specialization = typeof SPECIALIZATIONS[number];
