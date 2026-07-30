import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from '../../src/lib/alert';
import { Screen } from '../../src/components/Screen';
import { Avatar } from '../../src/components/Avatar';
import { RatingBadge } from '../../src/components/RatingBadge';
import { LoadingView } from '../../src/components/LoadingView';
import { colors, radius, spacing, typography, SKILL_LABELS } from '../../src/theme/theme';
import { fetchPlayerProfile } from '../../src/api/users';
import { submitReview } from '../../src/api/reviews';
import { useAuthStore } from '../../src/store/auth.store';

export default function PlayerProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentUser = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['player', id], queryFn: () => fetchPlayerProfile(id) });

  if (isLoading || !data) return <LoadingView />;

  const { user, stats, badges, reviews, recentGames } = data;
  const isSelf = currentUser?.id === id;

  const rate = async () => {
    if (rating === 0) {
      Alert.alert('Pick a star rating first');
      return;
    }
    setSubmitting(true);
    try {
      await submitReview({ targetType: 'PLAYER', targetId: id, rating, comment: comment || undefined });
      setComment('');
      setRating(0);
      qc.invalidateQueries({ queryKey: ['player', id] });
      Alert.alert('Thanks for the feedback!');
    } catch (err) {
      Alert.alert('Could not submit review', (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.profileHeader}>
        <Avatar uri={user.avatarUrl} name={user.name} size={80} />
        <Text style={styles.name}>{user.name}</Text>
        <RatingBadge rating={user.ratingAvg} count={user.ratingCount} />
        {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
      </View>

      <View style={styles.statsRow}>
        <Stat label="Hosted" value={stats.hostedCount} />
        <Stat label="Played" value={stats.playedCount} />
        <Stat label="Reviews" value={stats.reviewCount} />
      </View>

      {badges.length ? (
        <View style={styles.badgeRow}>
          {badges.map((b) => (
            <View key={b.key} style={styles.badge}>
              <Text style={styles.badgeIcon}>{b.icon}</Text>
              <Text style={styles.badgeLabel}>{b.label}</Text>
            </View>
          ))}
        </View>
      ) : null}

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

      {!isSelf && (
        <View style={styles.reviewCard}>
          <Text style={styles.sectionTitle}>Rate this player</Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setRating(n)}>
                <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={28} color={colors.star} />
              </Pressable>
            ))}
          </View>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Leave a comment (optional)"
            style={styles.commentInput}
            multiline
          />
          <Pressable onPress={rate} disabled={submitting} style={styles.submitReview}>
            <Text style={styles.submitReviewText}>{submitting ? 'Submitting...' : 'Submit review'}</Text>
          </Pressable>
        </View>
      )}

      <Text style={styles.sectionTitle}>Recent games</Text>
      {recentGames.length === 0 ? (
        <Text style={styles.empty}>No games played yet</Text>
      ) : (
        recentGames.map((g) => (
          <Pressable key={g.id} style={styles.gameRow} onPress={() => router.push(`/game/${g.id}`)}>
            <Text style={styles.gameSport}>{g.sport}</Text>
            <Text style={styles.gameVenue}>{g.venue?.name ?? 'Location TBD'}</Text>
          </Pressable>
        ))
      )}

      <Text style={styles.sectionTitle}>Reviews ({reviews.length})</Text>
      {reviews.length === 0 ? (
        <Text style={styles.empty}>No reviews yet</Text>
      ) : (
        reviews.map((r) => (
          <View key={r.id} style={styles.reviewRow}>
            <Avatar uri={r.author.avatarUrl} name={r.author.name} size={28} />
            <View style={styles.reviewBody}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewAuthor}>{r.author.name}</Text>
                <RatingBadge rating={r.rating} />
              </View>
              {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
            </View>
          </View>
        ))
      )}
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  profileHeader: { alignItems: 'center', gap: 6, marginTop: spacing.sm },
  name: { ...typography.h2, color: colors.text },
  bio: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs },
  statsRow: { flexDirection: 'row', backgroundColor: colors.bgAlt, borderRadius: radius.lg, marginTop: spacing.xl, paddingVertical: spacing.md },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { ...typography.h2, color: colors.primaryDark },
  statLabel: { ...typography.small, color: colors.textMuted },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  badge: { alignItems: 'center', backgroundColor: colors.bgAlt, borderRadius: radius.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, gap: 2 },
  badgeIcon: { fontSize: 20 },
  badgeLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  pill: { backgroundColor: colors.bgAlt, borderRadius: radius.full, paddingVertical: 6, paddingHorizontal: spacing.md },
  pillAccent: { backgroundColor: colors.primaryLight },
  pillText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  pillAccentText: { color: colors.primaryDark },
  reviewCard: { backgroundColor: colors.bgAlt, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.xl },
  sectionTitle: { ...typography.h3, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
  starRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  commentInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, marginTop: spacing.md, minHeight: 50, backgroundColor: colors.surface, color: colors.text },
  submitReview: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 10, alignItems: 'center', marginTop: spacing.md },
  submitReviewText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  empty: { ...typography.body, color: colors.textMuted },
  gameRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  gameSport: { ...typography.bodyMedium, color: colors.text },
  gameVenue: { ...typography.small, color: colors.textMuted },
  reviewRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  reviewBody: { flex: 1 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewAuthor: { ...typography.bodyMedium, color: colors.text },
  reviewComment: { ...typography.small, color: colors.textMuted, marginTop: 2 },
});
