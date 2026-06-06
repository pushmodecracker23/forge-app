// TODO: real HealthKit — requires EAS Build, mocked for Expo Go

export interface HealthData {
  kcalBurned: number;
  steps: number;
  bpm: number;
  waterOz: number;
}

export interface ExerciseEntry {
  id: string;
  name: string;
  icon: string;
  durationMin: number;
  kcal: number;
  color: string;
}

export async function getHealthData(): Promise<HealthData> {
  // TODO: real HealthKit — requires EAS Build, mocked for Expo Go
  return {
    kcalBurned: 320,
    steps: 8412,
    bpm: 142,
    waterOz: 64.7,
  };
}

export async function getExercises(): Promise<ExerciseEntry[]> {
  // TODO: real HealthKit — requires EAS Build, mocked for Expo Go
  return [
    { id: '1', name: 'Karate', icon: '🥋', durationMin: 30, kcal: 356, color: '#FFE8E8' },
    { id: '2', name: 'Yoga', icon: '🧘', durationMin: 45, kcal: 298, color: '#E8F0FF' },
    { id: '3', name: 'Weight Lifting', icon: '🏋️', durationMin: 60, kcal: 412, color: '#E8FFE8' },
  ];
}
