import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from '../../src/lib/alert';
import { Screen } from '../../src/components/Screen';
import { Avatar } from '../../src/components/Avatar';
import { RatingBadge } from '../../src/components/RatingBadge';
import { LoadingView } from '../../src/components/LoadingView';
import { colors, radius, spacing, typography, SKILL_LABELS } from '../../src/theme/theme';
import { useAuthStore } from '../../src/store/auth.store';
import { fetchPlayerProfile } from '../../src/api/users';
import { fetchPendingVenueReviews } from '../../src/api/reviews';

export default function Profile() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const { data, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchPlayerProfile(user!.id),
    enabled: !!user,
  });

  const pendingReviews = useQuery({
    queryKey: ['pending-reviews'],
    queryFn: fetchPendingVenueReviews,
  });

  if (!user || isLoading) return <LoadingView />;

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'You can sign back in anytime with your phone number.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Avatar uri={user.avatarUrl} name={user.name} size={72} />
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{user.name}</Text>
          <RatingBadge rating={user.ratingAvg} count={user.ratingCount} />
          <Text style={styles.city}>{user.city ?? 'Location not set'}</Text>
        </View>
        <Pressable onPress={() => router.push('/settings')}>
          <Ionicons name="settings-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <Stat label="Hosted" value={data?.stats.hostedCount ?? 0} />
        <Stat label="Played" value={data?.stats.playedCount ?? 0} />
        <Stat label="Points" value={user.rewardPoints ?? 0} />
      </View>

      {data?.badges.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Badges</Text>
          <View style={styles.badgeRow}>
            {data.badges.map((b) => (
              <View key={b.key} style={styles.badge}>
                <Text style={styles.badgeIcon}>{b.icon}</Text>
                <Text style={styles.badgeLabel}>{b.label}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sports & skill</Text>
        <View style={styles.pillRow}>
          {user.sportPreferences.map((s) => (
            <View key={s} style={styles.pill}>
              <Text style={styles.pillText}>{s}</Text>
            </View>
          ))}
          <View style={[styles.pill, styles.pillAccent]}>
            <Text style={[styles.pillText, styles.pillAccentText]}>{SKILL_LABELS[user.skillLevel]}</Text>
          </View>
        </View>
      </View>

      {pendingReviews.data?.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rate your recent venues</Text>
          {pendingReviews.data.map((v) => (
            <Pressable key={v.id} style={styles.reviewRow} onPress={() => router.push(`/venue/${v.id}`)}>
              <Text style={styles.reviewVenue}>{v.name}</Text>
              <Text style={styles.reviewCta}>Rate now →</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Referral</Text>
        <View style={styles.referralCard}>
          <Text style={styles.referralLabel}>Share your code, earn 100 points each</Text>
          <Text style={styles.referralCode}>{user.referralCode}</Text>
        </View>
      </View>

      <Pressable onPress={confirmSignOut} style={styles.signOutBtn}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerInfo: { flex: 1, gap: 4 },
  name: { ...typography.h2, color: colors.text },
  city: { ...typography.small, color: colors.textMuted },
  statsRow: { flexDirection: 'row', backgroundColor: colors.bgAlt, borderRadius: radius.lg, marginTop: spacing.lg, paddingVertical: spacing.md },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { ...typography.h2, color: colors.primaryDark },
  statLabel: { ...typography.small, color: colors.textMuted },
  section: { marginTop: spacing.xl },
  sectionTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.sm },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge: { alignItems: 'center', backgroundColor: colors.bgAlt, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, gap: 2 },
  badgeIcon: { fontSize: 20 },
  badgeLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: { backgroundColor: colors.bgAlt, borderRadius: radius.full, paddingVertical: 6, paddingHorizontal: spacing.md },
  pillAccent: { backgroundColor: colors.primaryLight },
  pillText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  pillAccentText: { color: colors.primaryDark },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  reviewVenue: { ...typography.body, color: colors.text },
  reviewCta: { ...typography.small, color: colors.primary, fontWeight: '700' },
  referralCard: { backgroundColor: colors.primaryLight, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center' },
  referralLabel: { ...typography.small, color: colors.primaryDark, textAlign: 'center' },
  referralCode: { ...typography.h2, color: colors.primaryDark, marginTop: spacing.xs, letterSpacing: 2 },
  signOutBtn: { marginTop: spacing.xxl, marginBottom: spacing.xl, alignItems: 'center' },
  signOutText: { ...typography.bodyMedium, color: colors.danger },
});
