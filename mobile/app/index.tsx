import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/auth.store';

/** Entry gate: routes to onboarding, profile setup, or the main app. */
export default function Index() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  if (!token || !user) return <Redirect href="/onboarding/welcome" />;
  if (!user.onboardedAt) return <Redirect href="/onboarding/profile-setup" />;
  return <Redirect href="/(tabs)/home" />;
}
