export type Goal = 'cut' | 'bulk' | 'maintain' | 'recomp';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type WorkoutSource = 'manual' | 'apple_health';
export type Gender = 'male' | 'female';

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  full_name?: string;
  age: number;
  height_cm: number;
  current_weight: number;
  target_weight: number;
  goal: Goal;
  activity_level: ActivityLevel;
  tdee: number;
  protein_target: number;
  carbs_target: number;
  fat_target: number;
  calorie_target: number;
  gender?: Gender;
  deficit_kcal?: number;
  created_at: string;
}

export interface FoodLog {
  id: string;
  user_id: string;
  date: string;
  food_name: string;
  brand: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_g: number;
  meal_type: MealType;
  is_saved_meal: boolean;
  created_at: string;
}

export interface SavedMeal {
  id: string;
  user_id: string;
  name: string;
  items: FoodLogItem[];
  total_kcal: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  created_at: string;
}

export interface FoodLogItem {
  food_name: string;
  brand?: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_g: number;
}

export interface Workout {
  id: string;
  user_id: string;
  date: string;
  name: string;
  duration_min: number;
  kcal_burned: number;
  source: WorkoutSource;
  apple_health_id?: string;
  created_at: string;
}

export interface ExerciseSet {
  reps: number;
  weight_kg: number;
}

export interface Exercise {
  id: string;
  workout_id: string;
  user_id: string;
  name: string;
  muscle_group: string;
  sets: ExerciseSet[];
  created_at: string;
}

export interface BodyWeightLog {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number;
  note?: string;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, 'id' | 'created_at'>; Update: Partial<Profile> };
      food_log: { Row: FoodLog; Insert: Omit<FoodLog, 'id' | 'created_at'>; Update: Partial<FoodLog> };
      saved_meals: { Row: SavedMeal; Insert: Omit<SavedMeal, 'id' | 'created_at'>; Update: Partial<SavedMeal> };
      workouts: { Row: Workout; Insert: Omit<Workout, 'id' | 'created_at'>; Update: Partial<Workout> };
      exercises: { Row: Exercise; Insert: Omit<Exercise, 'id' | 'created_at'>; Update: Partial<Exercise> };
      body_weight_log: { Row: BodyWeightLog; Insert: Omit<BodyWeightLog, 'id' | 'created_at'>; Update: Partial<BodyWeightLog> };
    };
  };
}
