import { create } from 'zustand';
import { Workout, Exercise } from '../types/database';

interface WorkoutStore {
  activeWorkout: Workout | null;
  exercises: Exercise[];
  setActiveWorkout: (w: Workout | null) => void;
  setExercises: (ex: Exercise[]) => void;
  addExercise: (ex: Exercise) => void;
  clear: () => void;
}

export const useWorkoutStore = create<WorkoutStore>()((set) => ({
  activeWorkout: null,
  exercises: [],
  setActiveWorkout: (w) => set({ activeWorkout: w }),
  setExercises: (ex) => set({ exercises: ex }),
  addExercise: (ex) => set((s) => ({ exercises: [...s.exercises, ex] })),
  clear: () => set({ activeWorkout: null, exercises: [] }),
}));
