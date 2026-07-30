import { create } from 'zustand';
import { storage } from '../lib/storage';
import type { User } from '../types/api';

const TOKEN_KEY = 'gameon_token';
const USER_KEY = 'gameon_user';

interface AuthState {
  token: string | null;
  user: User | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  signIn: (token: string, user: User) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  hydrated: false,

  hydrate: async () => {
    const [token, userJson] = await Promise.all([
      storage.getItem(TOKEN_KEY),
      storage.getItem(USER_KEY),
    ]);
    set({
      token: token ?? null,
      user: userJson ? JSON.parse(userJson) : null,
      hydrated: true,
    });
  },

  signIn: async (token, user) => {
    await Promise.all([
      storage.setItem(TOKEN_KEY, token),
      storage.setItem(USER_KEY, JSON.stringify(user)),
    ]);
    set({ token, user });
  },

  updateUser: async (user) => {
    await storage.setItem(USER_KEY, JSON.stringify(user));
    set({ user });
  },

  signOut: async () => {
    await Promise.all([storage.deleteItem(TOKEN_KEY), storage.deleteItem(USER_KEY)]);
    set({ token: null, user: null });
  },
}));
