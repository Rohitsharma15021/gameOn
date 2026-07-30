import { create } from 'zustand';
import type { AdminUser } from '../types';

const TOKEN_KEY = 'gameon_admin_token';
const USER_KEY = 'gameon_admin_user';

interface AuthState {
  token: string | null;
  user: AdminUser | null;
  signIn: (token: string, user: AdminUser) => void;
  signOut: () => void;
}

function loadUser(): AdminUser | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem(TOKEN_KEY),
  user: loadUser(),

  signIn: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ token, user });
  },

  signOut: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, user: null });
  },
}));
