import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/auth.store';

/**
 * Resolves the API base URL for dev without hardcoding a LAN IP:
 * - Web/iOS simulator can reach `localhost` directly.
 * - Android emulator maps host loopback to 10.0.2.2.
 * - A physical device needs your machine's LAN IP — set EXPO_PUBLIC_API_URL
 *   (e.g. in mobile/.env) to override in that case.
 */
function resolveApiUrl() {
  const override = process.env.EXPO_PUBLIC_API_URL;
  if (override) return override;

  const configured = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  if (Platform.OS === 'android' && configured?.includes('localhost')) {
    return configured.replace('localhost', '10.0.2.2');
  }
  return configured || 'http://localhost:4000';
}

export const API_URL = resolveApiUrl();

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().signOut();
    }
    const message =
      error.response?.data?.error?.message || error.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  },
);
