import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../src/components/Screen';
import { VenueCard } from '../../src/components/VenueCard';
import { GameCard } from '../../src/components/GameCard';
import { SportChip } from '../../src/components/SportChip';
import { EmptyState } from '../../src/components/EmptyState';
import { colors, spacing, typography, SPORTS } from '../../src/theme/theme';
import { useLocation } from '../../src/hooks/useLocation';
import { searchVenues } from '../../src/api/venues';
import { searchGames } from '../../src/api/games';
import { useAuthStore } from '../../src/store/auth.store';
import { fetchNotifications } from '../../src/api/notifications';
import { Ionicons } from '@expo/vector-icons';

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

  const refreshing = venuesQuery.isFetching || gamesQuery.isFetching;
  const onRefresh = () => {
    venuesQuery.refetch();
    gamesQuery.refetch();
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
  chipRow: { marginBottom: spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, marginTop: spacing.sm },
  sectionTitle: { ...typography.h3, color: colors.text },
  seeAll: { ...typography.small, color: colors.primary, fontWeight: '600' },
});
