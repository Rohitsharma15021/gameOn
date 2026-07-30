import { api } from './client';
import type { SkillLevel, User } from '../types/api';

export interface ProfileInput {
  name?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  sportPreferences?: string[];
  skillLevel?: SkillLevel;
}

export const updateProfile = (data: ProfileInput) =>
  api.patch<{ user: User }>('/users/me', data).then((r) => r.data.user);

export const completeOnboarding = (data: ProfileInput) =>
  api.post<{ user: User }>('/users/me/onboarding', data).then((r) => r.data.user);

export interface PlayerProfile {
  user: User;
  stats: { hostedCount: number; playedCount: number; reviewCount: number };
  badges: { key: string; label: string; icon: string }[];
  reviews: { id: string; rating: number; comment: string | null; author: { id: string; name: string; avatarUrl: string | null } }[];
  recentGames: { id: string; sport: string; startsAt: string; venue: { id: string; name: string; city: string } | null }[];
}

export const fetchPlayerProfile = (id: string) =>
  api.get<PlayerProfile>(`/users/${id}`).then((r) => r.data);
