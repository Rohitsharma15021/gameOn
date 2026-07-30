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
  danger: '#DC2626',
  warning: '#D97706',
  success: '#16A34A',
  star: '#F59E0B',
  overlay: 'rgba(15,23,42,0.5)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const },
  h2: { fontSize: 22, fontWeight: '700' as const },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  bodyMedium: { fontSize: 15, fontWeight: '600' as const },
  small: { fontSize: 13, fontWeight: '400' as const },
  tiny: { fontSize: 11, fontWeight: '500' as const },
};

export const SKILL_LABELS: Record<string, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
  PRO: 'Pro',
};

export const SPORTS = [
  { key: 'Badminton', icon: '🏸' },
  { key: 'Football', icon: '⚽' },
  { key: 'Tennis', icon: '🎾' },
  { key: 'Cricket', icon: '🏏' },
  { key: 'Table Tennis', icon: '🏓' },
  { key: 'Basketball', icon: '🏀' },
];
