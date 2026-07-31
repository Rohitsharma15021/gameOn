// Mirrors mobile/src/theme/theme.ts so the landing page, admin console, and
// mobile app all read as one product.
export const colors = {
  primary: '#16A34A',
  primaryDark: '#15803D',
  primaryLight: '#DCFCE7',
  secondary: '#2563EB',
  bg: '#FFFFFF',
  bgAlt: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  textMuted: '#64748B',
  textFaint: '#94A3B8',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const SPORTS = [
  { key: 'Badminton', icon: '🏸' },
  { key: 'Football', icon: '⚽' },
  { key: 'Tennis', icon: '🎾' },
  { key: 'Cricket', icon: '🏏' },
  { key: 'Table Tennis', icon: '🏓' },
  { key: 'Basketball', icon: '🏀' },
];

// Dev URLs for the other two apps in this monorepo — CTAs route visitors
// into the actual product instead of an app-store badge.
export const APP_URL = 'http://localhost:8081';
export const ADMIN_URL = 'http://localhost:5173';
