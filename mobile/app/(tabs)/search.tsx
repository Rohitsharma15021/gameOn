import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../src/components/Screen';
import { VenueCard } from '../../src/components/VenueCard';
import { VenueMapView } from '../../src/components/VenueMapView';
import { SportChip } from '../../src/components/SportChip';
import { EmptyState } from '../../src/components/EmptyState';
import { LoadingView } from '../../src/components/LoadingView';
import { colors, radius, spacing, typography, SPORTS } from '../../src/theme/theme';
import { useLocation } from '../../src/hooks/useLocation';
import { searchVenues } from '../../src/api/venues';
import { useAuthStore } from '../../src/store/auth.store';

type Sort = 'distance' | 'rating' | 'price';

export default function Search() {
  const user = useAuthStore((s) => s.user);
  const { coords } = useLocation();
  const [query, setQuery] = useState('');
  const [sport, setSport] = useState<string | undefined>();
  const [sort, setSort] = useState<Sort>('distance');
  const [showMap, setShowMap] = useState(false);

  const geo = coords ?? (user?.latitude && user?.longitude ? { latitude: user.latitude, longitude: user.longitude } : null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['search-venues', query, sport, sort, geo?.latitude, geo?.longitude],
    queryFn: () =>
      searchVenues({
        search: query || undefined,
        sport,
        sort,
        lat: geo?.latitude,
        lng: geo?.longitude,
        limit: 30,
      }),
  });

  return (
    <Screen padded={false}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search venues, areas..."
          style={styles.searchInput}
        />
        <Pressable onPress={() => setShowMap((v) => !v)}>
          <Ionicons name={showMap ? 'list' : 'map'} size={20} color={colors.primary} />
        </Pressable>
      </View>

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

      <View style={styles.sortRow}>
        {(['distance', 'rating', 'price'] as Sort[]).map((s) => (
          <Pressable key={s} onPress={() => setSort(s)} style={[styles.sortPill, sort === s && styles.sortPillActive]}>
            <Text style={[styles.sortText, sort === s && styles.sortTextActive]}>
              {s === 'distance' ? 'Nearest' : s === 'rating' ? 'Top rated' : 'Price'}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <LoadingView />
      ) : showMap ? (
        <VenueMapView venues={data?.venues ?? []} center={geo} />
      ) : (
        <FlatList
          data={data?.venues ?? []}
          keyExtractor={(v) => v.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <VenueCard venue={item} />}
          ListEmptyComponent={
            <EmptyState icon="🔍" title="No venues match your filters" subtitle="Try widening your search" />
          }
          refreshing={isFetching}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.bgAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  chipRow: { marginBottom: spacing.sm },
  sortRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  sortPill: { paddingVertical: 6, paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: colors.bgAlt },
  sortPillActive: { backgroundColor: colors.text },
  sortText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  sortTextActive: { color: '#fff' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
});
