import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { colors, spacing, typography } from '../../src/theme/theme';

export default function Welcome() {
  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.logo}>🏆</Text>
        <Text style={styles.brand}>gameOn</Text>
        <Text style={styles.tagline}>Book courts. Find players. Just play.</Text>
      </View>

      <View style={styles.features}>
        <Feature icon="📍" text="Discover badminton, football, tennis & more nearby" />
        <Feature icon="⚡" text="Book a slot in seconds and split the bill with friends" />
        <Feature icon="🤝" text="Join open games or host your own — meet new players" />
      </View>

      <View style={styles.actions}>
        <Button title="Get started" onPress={() => router.push('/onboarding/login')} />
      </View>
    </Screen>
  );
}

function Feature({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginTop: spacing.xxl * 1.5, marginBottom: spacing.xxl },
  logo: { fontSize: 64, marginBottom: spacing.sm },
  brand: { ...typography.h1, color: colors.primaryDark },
  tagline: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' },
  features: { flex: 1, gap: spacing.lg, paddingTop: spacing.lg },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  featureIcon: { fontSize: 24 },
  featureText: { ...typography.body, color: colors.text, flex: 1 },
  actions: { paddingBottom: spacing.lg },
});
