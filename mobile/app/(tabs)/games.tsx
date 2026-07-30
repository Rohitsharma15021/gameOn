import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { GameCard } from '../../src/components/GameCard';
import { SportChip } from '../../src/components/SportChip';
import { EmptyState } from '../../src/components/EmptyState';
import { LoadingView } from '../../src/components/LoadingView';
import { colors, radius, spacing, typography, SPORTS } from '../../src/theme/theme';
import { useLocation } from '../../src/hooks/useLocation';
import { searchGames, fetchMyGames } from '../../src/api/games';
import { useAuthStore } from '../../src/store/auth.store';

type Tab = 'discover' | 'mine';

export default function Games() {
  const user = useAuthStore((s) => s.user);
  const { coords } = useLocation();
  const [tab, setTab] = useState<Tab>('discover');
  const [sport, setSport] = useState<string | undefined>();

  const geo = coords ?? (user?.latitude && user?.longitude ? { latitude: user.latitude, longitude: user.longitude } : null);

  const discoverQuery = useQuery({
    queryKey: ['discover-games', sport, geo?.latitude, geo?.longitude],
    queryFn: () => searchGames({ sport, lat: geo?.latitude, lng: geo?.longitude, limit: 30 }),
    enabled: tab === 'discover',
  });

  const mineQuery = useQuery({
    queryKey: ['my-games'],
    queryFn: fetchMyGames,
    enabled: tab === 'mine',
  });

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Games</Text>
        <Pressable style={styles.hostBtn} onPress={() => router.push('/game/new')}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.hostBtnText}>Host</Text>
        </Pressable>
      </View>

      <View style={styles.segment}>
        <Pressable onPress={() => setTab('discover')} style={[styles.segmentBtn, tab === 'discover' && styles.segmentBtnActive]}>
          <Text style={[styles.segmentText, tab === 'discover' && styles.segmentTextActive]}>Find a game</Text>
        </Pressable>
        <Pressable onPress={() => setTab('mine')} style={[styles.segmentBtn, tab === 'mine' && styles.segmentBtnActive]}>
          <Text style={[styles.segmentText, tab === 'mine' && styles.segmentTextActive]}>My games</Text>
        </Pressable>
      </View>

      {tab === 'discover' ? (
        <>
          <FlatList
            data={SPORTS}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(s) => s.key}
            style={styles.chipRow}
            contentContainerStyle={{ paddingHorizontal: spacing.lg }}
            renderItem={({ item }) => (
              <SportChip
                sport={item.key}
                selected={sport === item.key}
                onPress={() => setSport(sport === item.key ? undefined : item.key)}
              />
            )}
          />
          {discoverQuery.isLoading ? (
            <LoadingView />
          ) : (
            <FlatList
              data={discoverQuery.data?.games ?? []}
              keyExtractor={(g) => g.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => <GameCard game={item} />}
              refreshing={discoverQuery.isFetching}
              onRefresh={discoverQuery.refetch}
              ListEmptyComponent={
                <EmptyState icon="🎮" title="No open games nearby" subtitle="Host one and invite players around you" />
              }
            />
          )}
        </>
      ) : mineQuery.isLoading ? (
        <LoadingView />
      ) : (
        <FlatList
          data={[
            ...(mineQuery.data?.upcoming.length ? [{ type: 'header', label: 'Upcoming' } as const] : []),
            ...(mineQuery.data?.upcoming.map((g) => ({ type: 'game', game: g }) as const) ?? []),
            ...(mineQuery.data?.past.length ? [{ type: 'header', label: 'Past' } as const] : []),
            ...(mineQuery.data?.past.map((g) => ({ type: 'game', game: g }) as const) ?? []),
          ]}
          keyExtractor={(item, i) => (item.type === 'header' ? `h-${item.label}` : item.game.id) + i}
          contentContainerStyle={styles.list}
          renderItem={({ item }) =>
            item.type === 'header' ? (
              <Text style={styles.sectionLabel}>{item.label}</Text>
            ) : (
              <GameCard game={item.game} />
            )
          }
          refreshing={mineQuery.isFetching}
          onRefresh={mineQuery.refetch}
          ListEmptyComponent={
            <EmptyState icon="📅" title="No games yet" subtitle="Join or host a game to see it here" />
          }
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, marginTop: spacing.md },
  title: { ...typography.h2, color: colors.text },
  hostBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, borderRadius: radius.full, paddingVertical: 8, paddingHorizontal: spacing.md },
  hostBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  segment: { flexDirection: 'row', backgroundColor: colors.bgAlt, borderRadius: radius.md, marginHorizontal: spacing.lg, marginTop: spacing.md, padding: 4 },
  segmentBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: colors.surface },
  segmentText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  segmentTextActive: { color: colors.text },
  chipRow: { marginTop: spacing.md, marginBottom: spacing.xs },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl },
  sectionLabel: { ...typography.bodyMedium, color: colors.textMuted, marginBottom: spacing.sm, marginTop: spacing.sm },
});
