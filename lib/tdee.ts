export type Goal = 'cut' | 'bulk' | 'maintain' | 'recomp';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_CALORIE_ADJUSTMENTS: Record<Goal, number> = {
  cut: -500,
  bulk: 300,
  maintain: 0,
  recomp: -200,
};

export function calculateBMR(weightKg: number, heightCm: number, ageYears: number, isMale = true): number {
  if (isMale) {
    return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5;
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161;
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

export function calculateMacros(
  tdee: number,
  goal: Goal,
  weightKg: number
): MacroTargets {
  const calories = tdee + GOAL_CALORIE_ADJUSTMENTS[goal];

  const proteinMultipliers: Record<Goal, number> = {
    cut: 2.4,
    bulk: 2.0,
    maintain: 1.8,
    recomp: 2.4,
  };

  const protein = Math.round(weightKg * proteinMultipliers[goal]);
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);

  return {
    calories: Math.round(calories),
    protein,
    carbs: Math.max(carbs, 50),
    fat,
  };
}
