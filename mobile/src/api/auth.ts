import { api } from './client';
import type { User } from '../types/api';

export const requestOtp = (phone: string) =>
  api.post<{ phone: string; expiresInSeconds: number; devCode?: string }>('/auth/otp/request', {
    phone,
  }).then((r) => r.data);

export const verifyOtp = (phone: string, code: string, name?: string, referralCode?: string) =>
  api
    .post<{ token: string; user: User; isNewUser: boolean; needsOnboarding: boolean }>(
      '/auth/otp/verify',
      { phone, code, name, referralCode },
    )
    .then((r) => r.data);

export const fetchMe = () => api.get<{ user: User }>('/auth/me').then((r) => r.data.user);

export const registerDevice = (token: string, platform: 'ios' | 'android' | 'web') =>
  api.post('/auth/devices', { token, platform }).then((r) => r.data);
