import { callFunction } from './backend';
import { FitnessBlueprint } from '../types/user';

type BlueprintInput = { age: number; gender: string; weight: number; height: number; fitnessLevel: string; goals: string[] };

/** AI fitness blueprint from the server (keeps the AI key off the phone). null = use the built-in plan. */
export const requestBlueprint = async (input: BlueprintInput) =>
  (await callFunction<{ blueprint: Omit<FitnessBlueprint, 'goals' | 'generatedAt'> | null }>('generate-blueprint', input, 8000)).blueprint;
