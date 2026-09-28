export type UserRole = 'client' | 'trainer' | 'admin';

export type KYCStatus =
  | 'not_started'
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected';

export type Gender = 'male' | 'female' | 'prefer_not_to_say';

export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';

export type SessionPreference = 'online' | 'offline' | 'both';

export type BudgetRange =
  | 'under_300'
  | '300_700'
  | '700_1500'
  | '1500_plus';

export enum FitnessGoal {
  WEIGHT_LOSS = 'weight_loss',
  MUSCLE_GAIN = 'muscle_gain',
  ENDURANCE = 'endurance',
  FLEXIBILITY = 'flexibility',
  DIET_ONLY = 'diet_only',
  GENERAL_FITNESS = 'general_fitness',
}

export const FitnessGoalLabel: Record<FitnessGoal, string> = {
  [FitnessGoal.WEIGHT_LOSS]: '🔥 Lose Weight',
  [FitnessGoal.MUSCLE_GAIN]: '💪 Build Muscle',
  [FitnessGoal.ENDURANCE]: '🏃 Improve Stamina',
  [FitnessGoal.FLEXIBILITY]: '🧘 Flexibility & Mobility',
  [FitnessGoal.DIET_ONLY]: '🥗 Diet Plan Only',
  [FitnessGoal.GENERAL_FITNESS]: '⚡ General Fitness',
};

export interface FitnessBlueprint {
  goals: FitnessGoal[];
  trainerType: string;
  recommendedStyle: string;
  estimatedTimeline: string;
  additionalNotes: string;
  recommendedFilters: {
    specializations: string[];
    sessionPreference: SessionPreference;
    minExperience: number;
  };
  generatedAt: Date;
}

export interface User {
  id: string;
  phone: string;
  email?: string;
  name: string;
  profilePhoto?: string;
  role: UserRole;
  kycStatus: KYCStatus;
  aadhaarVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientProfile {
  userId: string;
  name: string;
  age: number;
  gender: Gender;
  height: number;
  heightUnit: 'cm' | 'ft';
  weight: number;
  profilePhoto?: string;
  fitnessLevel: FitnessLevel;
  currentlyGoesToGym: boolean;
  gymName?: string;
  goals: FitnessGoal[];
  sessionPreference: SessionPreference;
  budgetRange: BudgetRange;
  aadhaarVerified: boolean;
  fitnessBlueprint?: FitnessBlueprint;
  createdAt: Date;
  updatedAt: Date;
}

export const BudgetRangeLabel: Record<BudgetRange, string> = {
  under_300: 'Under ₹300',
  '300_700': '₹300 – ₹700',
  '700_1500': '₹700 – ₹1,500',
  '1500_plus': '₹1,500+ (Premium)',
};

export const BudgetRangeMax: Record<BudgetRange, number> = {
  under_300: 300,
  '300_700': 700,
  '700_1500': 1500,
  '1500_plus': 99999,
};
