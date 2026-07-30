import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, radius, spacing, typography, SKILL_LABELS, SPORTS } from '../theme/theme';
import { Avatar } from './Avatar';
import { dayLabel, distanceLabel, money, timeRange } from '../utils/format';
import type { Game } from '../types/api';

export function GameCard({ game }: { game: Game }) {
  const icon = SPORTS.find((s) => s.key === game.sport)?.icon ?? '🏅';
  const full = game.spotsLeft <= 0;

  return (
    <Pressable
      onPress={() => router.push(`/game/${game.id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.topRow}>
        <Text style={styles.sport}>{icon} {game.sport}</Text>
        <View style={[styles.badge, full && styles.badgeFull]}>
          <Text style={[styles.badgeText, full && styles.badgeTextFull]}>
            {full ? 'Full' : `${game.spotsLeft} spot${game.spotsLeft === 1 ? '' : 's'} left`}
          </Text>
        </View>
      </View>

      {game.title ? <Text style={styles.title}>{game.title}</Text> : null}

      <Text style={styles.when}>
        {dayLabel(game.startsAt)} · {timeRange(game.startsAt, game.endsAt)}
      </Text>
      {game.locationName ? (
        <Text style={styles.location} numberOfLines={1}>📍 {game.locationName}</Text>
      ) : null}

      <View style={styles.bottomRow}>
        <View style={styles.hostRow}>
          <Avatar uri={game.host.avatarUrl} name={game.host.name} size={24} />
          <Text style={styles.hostName}>{game.host.name}</Text>
        </View>
        <Text style={styles.skill}>{SKILL_LABELS[game.skillLevel]}</Text>
        {game.costPerPlayer > 0 ? (
          <Text style={styles.cost}>{money(game.costPerPlayer)}/player</Text>
        ) : (
          <Text style={styles.cost}>Free</Text>
        )}
      </View>
      {distanceLabel(game.distanceKm) ? (
        <Text style={styles.distance}>{distanceLabel(game.distanceKm)} away</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  pressed: { opacity: 0.9 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sport: { ...typography.bodyMedium, color: colors.text },
  badge: { backgroundColor: colors.primaryLight, borderRadius: radius.full, paddingVertical: 3, paddingHorizontal: spacing.sm },
  badgeFull: { backgroundColor: colors.bgAlt },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.primaryDark },
  badgeTextFull: { color: colors.textMuted },
  title: { ...typography.h3, marginTop: spacing.xs, color: colors.text },
  when: { ...typography.small, color: colors.textMuted, marginTop: spacing.xs },
  location: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: spacing.sm },
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  hostName: { fontSize: 12, fontWeight: '600', color: colors.text },
  skill: { fontSize: 11, color: colors.textMuted, backgroundColor: colors.bgAlt, paddingVertical: 2, paddingHorizontal: 6, borderRadius: radius.sm },
  cost: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
  distance: { ...typography.tiny, color: colors.textFaint, marginTop: spacing.xs },
});
