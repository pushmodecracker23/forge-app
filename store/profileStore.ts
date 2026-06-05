import { create } from 'zustand';
import { Profile } from '../types/database';

interface ProfileStore {
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
  clear: () => void;
}

export const useProfileStore = create<ProfileStore>()((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  clear: () => set({ profile: null }),
}));
