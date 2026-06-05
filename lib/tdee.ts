export type Goal = 'cut' | 'bulk' | 'maintain' | 'recomp';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Gender = 'male' | 'female';

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary (desk job, no exercise)',
  light: 'Light (1-3 workouts/week)',
  moderate: 'Moderate (3-5 workouts/week)',
  active: 'Active (6-7 workouts/week)',
  very_active: 'Very Active (2x/day or physical job)',
};

export interface DeficitOption {
  kcal: number;
  label: string;
  weeklyChangeKg: number;
  description: string;
  recommended?: boolean;
}

export const CUT_OPTIONS: DeficitOption[] = [
  { kcal: 300, label: 'Mild Cut', weeklyChangeKg: 0.27, description: 'Best for preserving muscle. Slower but very sustainable.', recommended: false },
  { kcal: 500, label: 'Moderate Cut', weeklyChangeKg: 0.45, description: '~0.5 kg/week. The gold standard for fat loss.', recommended: true },
  { kcal: 750, label: 'Aggressive Cut', weeklyChangeKg: 0.68, description: 'Faster results. Harder to sustain, higher muscle loss risk.', recommended: false },
];

export const BULK_OPTIONS: DeficitOption[] = [
  { kcal: 200, label: 'Lean Bulk', weeklyChangeKg: 0.18, description: 'Minimal fat gain. Slow but clean muscle growth.', recommended: false },
  { kcal: 350, label: 'Standard Bulk', weeklyChangeKg: 0.32, description: 'Best balance of muscle gain and fat control.', recommended: true },
  { kcal: 500, label: 'Aggressive Bulk', weeklyChangeKg: 0.45, description: 'Fastest muscle growth. Expect more fat gain.', recommended: false },
];

// Mifflin-St Jeor — most validated equation for general population (Frankenfield et al. 2005)
export function calculateBMR(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  gender: Gender = 'male'
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return gender === 'male' ? base + 5 : base - 161;
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// Protein targets (g/kg bodyweight) — based on ISSN/ACSM position stands
const PROTEIN_PER_KG: Record<Goal, number> = {
  cut: 2.4,      // Higher in deficit to spare lean mass (Helms et al. 2014)
  bulk: 2.0,     // Adequate for MPS (Morton et al. 2018)
  maintain: 1.8, // General maintenance
  recomp: 2.6,   // Maximum — simultaneous fat loss + muscle gain demands it
};

export function calculateMacros(
  tdee: number,
  goal: Goal,
  weightKg: number,
  deficitKcal: number = 500
): MacroTargets {
  let calories = tdee;
  if (goal === 'cut') calories = tdee - deficitKcal;
  else if (goal === 'bulk') calories = tdee + deficitKcal;
  else if (goal === 'recomp') calories = tdee - 200;

  calories = Math.max(Math.round(calories), 1200);

  const protein = Math.round(weightKg * PROTEIN_PER_KG[goal]);
  // Fat minimum: 0.8g/kg for hormonal health, max 35% of calories
  const fat = Math.max(Math.round(weightKg * 0.9), Math.round((calories * 0.22) / 9));
  const carbs = Math.max(Math.round((calories - protein * 4 - fat * 9) / 4), 50);

  return { calories, protein, carbs, fat };
}

export function estimateWeeksToGoal(currentKg: number, targetKg: number, weeklyChangeKg: number): number {
  if (weeklyChangeKg <= 0) return 0;
  return Math.ceil(Math.abs(currentKg - targetKg) / weeklyChangeKg);
}

export function ftInToCm(feet: number, inches: number): number {
  return Math.round((feet * 12 + inches) * 2.54);
}

export function cmToFtIn(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  return { feet: Math.floor(totalInches / 12), inches: Math.round(totalInches % 12) };
}

export function lbsToKg(lbs: number): number {
  return Math.round(lbs * 0.453592 * 10) / 10;
}

export function kgToLbs(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10;
}
