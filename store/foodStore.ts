import { create } from 'zustand';
import { FoodLog } from '../types/database';

interface FoodStore {
  todayLogs: FoodLog[];
  setTodayLogs: (logs: FoodLog[]) => void;
  addLog: (log: FoodLog) => void;
  removeLog: (id: string) => void;
  clear: () => void;
}

export const useFoodStore = create<FoodStore>()((set) => ({
  todayLogs: [],
  setTodayLogs: (logs) => set({ todayLogs: logs }),
  addLog: (log) => set((s) => ({ todayLogs: [...s.todayLogs, log] })),
  removeLog: (id) => set((s) => ({ todayLogs: s.todayLogs.filter((l) => l.id !== id) })),
  clear: () => set({ todayLogs: [] }),
}));
