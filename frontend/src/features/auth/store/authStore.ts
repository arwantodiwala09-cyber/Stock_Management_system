import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  activeOrganization: { id: string; name: string; slug: string; role: string } | null;
  isInitialized: boolean;
  setAuth: (user: User | null, session: Session | null) => void;
  setActiveOrganization: (org: { id: string; name: string; slug: string; role: string } | null) => void;
  setInitialized: (val: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  activeOrganization: null,
  isInitialized: false,
  setAuth: (user, session) => set({ user, session }),
  setActiveOrganization: (org) => set({ activeOrganization: org }),
  setInitialized: (val) => set({ isInitialized: val }),
  logout: () => set({ user: null, session: null, activeOrganization: null }),
}));
