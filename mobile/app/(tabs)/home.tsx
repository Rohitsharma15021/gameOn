import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../src/components/Screen';
import { VenueCard } from '../../src/components/VenueCard';
import { GameCard } from '../../src/components/GameCard';
import { SportChip } from '../../src/components/SportChip';
import { EmptyState } from '../../src/components/EmptyState';
import { colors, radius, spacing, typography, SPORTS } from '../../src/theme/theme';
import { useLocation } from '../../src/hooks/useLocation';
import { searchVenues } from '../../src/api/venues';
import { searchGames, fetchMyGames } from '../../src/api/games';
import { fetchBookings } from '../../src/api/bookings';
import { useAuthStore } from '../../src/store/auth.store';
import { fetchNotifications } from '../../src/api/notifications';
import { Ionicons } from '@expo/vector-icons';
import { dayLabel, timeRange } from '../../src/utils/format';

type Activity = { key: string; startsAt: string; title: string; subtitle: string; onPress: () => void };

export default function Home() {
  const user = useAuthStore((s) => s.user);
  const { coords } = useLocation();
  const [sport, setSport] = useState<string | undefined>(undefined);

  const geo = coords ?? (user?.latitude && user?.longitude ? { latitude: user.latitude, longitude: user.longitude } : null);

  const venuesQuery = useQuery({
    queryKey: ['home-venues', geo?.latitude, geo?.longitude, sport],
    queryFn: () =>
      searchVenues({
        lat: geo?.latitude,
        lng: geo?.longitude,
        sport,
        sort: 'distance',
        limit: 6,
      }),
  });

  const gamesQuery = useQuery({
    queryKey: ['home-games', geo?.latitude, geo?.longitude, sport],
    queryFn: () =>
      searchGames({
        lat: geo?.latitude,
        lng: geo?.longitude,
        sport,
        limit: 6,
      }),
  });

  const notifQuery = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => fetchNotifications(true),
    refetchInterval: 60_000,
  });

  const upcomingBookingsQuery = useQuery({ queryKey: ['home-upcoming-bookings'], queryFn: () => fetchBookings('upcoming') });
  const myGamesQuery = useQuery({ queryKey: ['home-my-games'], queryFn: fetchMyGames });

  const activities: Activity[] = [
    ...(upcomingBookingsQuery.data ?? []).map((b) => ({
      key: `booking-${b.id}`,
      startsAt: b.slot.startsAt,
      title: b.slot.court.venue.name,
      subtitle: `${dayLabel(b.slot.startsAt)} · ${timeRange(b.slot.startsAt, b.slot.endsAt)}`,
      onPress: () => router.push('/(tabs)/bookings'),
    })),
    ...(myGamesQuery.data?.upcoming ?? []).map((g) => ({
      key: `game-${g.id}`,
      startsAt: g.startsAt,
      title: g.title || g.sport,
      subtitle: `${dayLabel(g.startsAt)} · ${timeRange(g.startsAt, g.endsAt)}`,
      onPress: () => router.push(`/game/${g.id}`),
    })),
  ]
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 3);

  const refreshing = venuesQuery.isFetching || gamesQuery.isFetching;
  const onRefresh = () => {
    venuesQuery.refetch();
    gamesQuery.refetch();
    upcomingBookingsQuery.refetch();
    myGamesQuery.refetch();
  };

  return (
    <Screen scroll refreshing={refreshing} onRefresh={onRefresh}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hey {user?.name?.split(' ')[0] ?? 'there'} 👋</Text>
          <Text style={styles.location}>{user?.city ?? 'Set your location'}</Text>
        </View>
        <Pressable onPress={() => router.push('/notifications')} style={styles.bell}>
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
          {notifQuery.data?.unreadCount ? (
            <View style={styles.dot}>
              <Text style={styles.dotText}>{notifQuery.data.unreadCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {activities.length > 0 && (
        <>
          <Text style={styles.activitiesTitle}>Upcoming activities</Text>
          {activities.map((a) => (
            <Pressable key={a.key} onPress={a.onPress} style={styles.activityCard}>
              <View style={styles.activityDot} />
              <View style={styles.activityBody}>
                <Text style={styles.activityTitle}>{a.title}</Text>
                <Text style={styles.activitySubtitle}>{a.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </Pressable>
          ))}
        </>
      )}

      <FlatList
        data={SPORTS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.key}
        style={styles.chipRow}
        renderItem={({ item }) => (
          <SportChip
            sport={item.key}
            selected={sport === item.key}
            onPress={() => setSport(sport === item.key ? undefined : item.key)}
          />
        )}
      />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Venues near you</Text>
        <Pressable onPress={() => router.push('/(tabs)/search')}>
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      </View>
      {venuesQuery.data?.venues.length ? (
        venuesQuery.data.venues.map((v) => <VenueCard key={v.id} venue={v} />)
      ) : venuesQuery.isLoading ? null : (
        <EmptyState icon="🏟️" title="No venues found" subtitle="Try a different sport or check back later" />
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Open games</Text>
        <Pressable onPress={() => router.push('/(tabs)/games')}>
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      </View>
      {gamesQuery.data?.games.length ? (
        gamesQuery.data.games.map((g) => <GameCard key={g.id} game={g} />)
      ) : gamesQuery.isLoading ? null : (
        <EmptyState icon="🎮" title="No open games yet" subtitle="Be the first to host one nearby" />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  greeting: { ...typography.h2, color: colors.text },
  location: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  bell: { padding: spacing.xs },
  dot: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  dotText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  activitiesTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.sm },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  activityDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  activityBody: { flex: 1 },
  activityTitle: { ...typography.bodyMedium, color: colors.text },
  activitySubtitle: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  chipRow: { marginBottom: spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, marginTop: spacing.sm },
  sectionTitle: { ...typography.h3, color: colors.text },
  seeAll: { ...typography.small, color: colors.primary, fontWeight: '600' },
});
