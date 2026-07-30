import { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoadingView } from '../../src/components/LoadingView';
import { RatingBadge } from '../../src/components/RatingBadge';
import { Avatar } from '../../src/components/Avatar';
import { colors, radius, spacing, typography } from '../../src/theme/theme';
import { fetchVenue, fetchAvailability } from '../../src/api/venues';
import { distanceLabel, money } from '../../src/utils/format';
import type { Slot } from '../../src/types/api';

function nextDays(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
}

export default function VenueDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [dateIdx, setDateIdx] = useState(0);
  const [courtId, setCourtId] = useState<string | undefined>(undefined);

  const days = useMemo(() => nextDays(7), []);
  const dateStr = days[dateIdx].toISOString().slice(0, 10);

  const venueQuery = useQuery({ queryKey: ['venue', id], queryFn: () => fetchVenue(id) });
  const availabilityQuery = useQuery({
    queryKey: ['availability', id, dateStr],
    queryFn: () => fetchAvailability(id, dateStr),
    enabled: !!venueQuery.data,
  });

  if (venueQuery.isLoading || !venueQuery.data) return <LoadingView />;

  const { venue, reviews } = venueQuery.data;
  const courts = availabilityQuery.data?.courts ?? [];
  const activeCourt = courts.find((c) => c.court.id === courtId) ?? courts[0];

  const selectSlot = (slot: Slot) => {
    if (slot.status !== 'AVAILABLE') return;
    router.push({
      pathname: '/checkout',
      params: {
        slotId: slot.id,
        venueName: venue.name,
        courtName: activeCourt?.court.name ?? '',
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        price: String(slot.price),
      },
    });
  };

  return (
    <View style={styles.flex}>
      <ScrollView bounces={false}>
        <View style={styles.imageWrap}>
          <FlatList
            data={venue.images.length ? venue.images : ['https://picsum.photos/seed/venue/800/600']}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(uri, i) => uri + i}
            renderItem={({ item }) => <Image source={{ uri: item }} style={styles.image} />}
          />
          <SafeAreaView style={styles.backWrap} edges={['top']}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </Pressable>
          </SafeAreaView>
        </View>

        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.name}>{venue.name}</Text>
            <RatingBadge rating={venue.ratingAvg} count={venue.ratingCount} />
          </View>
          <Text style={styles.address}>
            {venue.address}
            {distanceLabel(venue.distanceKm) ? ` · ${distanceLabel(venue.distanceKm)} away` : ''}
          </Text>

          {venue.phone ? (
            <Pressable onPress={() => Linking.openURL(`tel:${venue.phone}`)} style={styles.callRow}>
              <Ionicons name="call" size={14} color={colors.primary} />
              <Text style={styles.callText}>{venue.phone}</Text>
            </Pressable>
          ) : null}

          {venue.description ? <Text style={styles.description}>{venue.description}</Text> : null}

          <Text style={styles.sectionTitle}>Amenities</Text>
          <View style={styles.chipWrap}>
            {venue.amenities.map((a) => (
              <View key={a} style={styles.chip}>
                <Text style={styles.chipText}>{a}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Book a slot</Text>
          <FlatList
            data={days}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(d) => d.toISOString()}
            style={styles.dayRow}
            renderItem={({ item, index }) => {
              const selected = index === dateIdx;
              return (
                <Pressable onPress={() => setDateIdx(index)} style={[styles.dayPill, selected && styles.dayPillActive]}>
                  <Text style={[styles.dayLabel, selected && styles.dayLabelActive]}>
                    {index === 0 ? 'Today' : item.toLocaleDateString('en-IN', { weekday: 'short' })}
                  </Text>
                  <Text style={[styles.dayNum, selected && styles.dayLabelActive]}>{item.getDate()}</Text>
                </Pressable>
              );
            }}
          />

          {courts.length > 1 ? (
            <FlatList
              data={courts}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(c) => c.court.id}
              style={styles.courtRow}
              renderItem={({ item }) => {
                const selected = activeCourt?.court.id === item.court.id;
                return (
                  <Pressable
                    onPress={() => setCourtId(item.court.id)}
                    style={[styles.courtPill, selected && styles.courtPillActive]}
                  >
                    <Text style={[styles.courtText, selected && styles.courtTextActive]}>{item.court.name}</Text>
                  </Pressable>
                );
              }}
            />
          ) : null}

          {availabilityQuery.isLoading ? (
            <LoadingView />
          ) : activeCourt ? (
            <View style={styles.slotGrid}>
              {activeCourt.slots.map((slot) => {
                const disabled = slot.status !== 'AVAILABLE';
                return (
                  <Pressable
                    key={slot.id}
                    disabled={disabled}
                    onPress={() => selectSlot(slot)}
                    style={[styles.slot, disabled && styles.slotDisabled]}
                  >
                    <Text style={[styles.slotTime, disabled && styles.slotTimeDisabled]}>
                      {new Date(slot.startsAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                    </Text>
                    <Text style={[styles.slotPrice, disabled && styles.slotTimeDisabled]}>{money(slot.price)}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={styles.noCourts}>No courts available for this sport</Text>
          )}

          <Text style={styles.sectionTitle}>Reviews ({reviews.length})</Text>
          {reviews.length === 0 ? (
            <Text style={styles.noReviews}>No reviews yet — be the first to play here!</Text>
          ) : (
            reviews.slice(0, 5).map((r) => (
              <View key={r.id} style={styles.reviewCard}>
                <Avatar uri={r.author.avatarUrl} name={r.author.name} size={32} />
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
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  imageWrap: { height: 240, backgroundColor: colors.bgAlt },
  image: { width: 400, height: 240 },
  backWrap: { position: 'absolute', top: 0, left: 0 },
  backBtn: { margin: spacing.md, backgroundColor: colors.overlay, borderRadius: radius.full, padding: spacing.sm },
  content: { padding: spacing.lg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  name: { ...typography.h1, color: colors.text, flex: 1 },
  address: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  callRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  callText: { ...typography.small, color: colors.primary, fontWeight: '600' },
  description: { ...typography.body, color: colors.text, marginTop: spacing.md, lineHeight: 21 },
  sectionTitle: { ...typography.h3, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: colors.bgAlt, borderRadius: radius.full, paddingVertical: 6, paddingHorizontal: spacing.md },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  dayRow: { marginTop: spacing.xs },
  dayPill: { alignItems: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.bgAlt, marginRight: spacing.sm, minWidth: 56 },
  dayPillActive: { backgroundColor: colors.primary },
  dayLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  dayNum: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 2 },
  dayLabelActive: { color: '#fff' },
  courtRow: { marginTop: spacing.md },
  courtPill: { paddingVertical: 8, paddingHorizontal: spacing.md, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, marginRight: spacing.sm },
  courtPillActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  courtText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  courtTextActive: { color: colors.primaryDark },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  slot: { width: '31%', paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary, alignItems: 'center' },
  slotDisabled: { borderColor: colors.border, backgroundColor: colors.bgAlt },
  slotTime: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  slotTimeDisabled: { color: colors.textFaint },
  slotPrice: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  noCourts: { ...typography.body, color: colors.textMuted, marginTop: spacing.md },
  noReviews: { ...typography.body, color: colors.textMuted },
  reviewCard: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  reviewBody: { flex: 1 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewAuthor: { ...typography.bodyMedium, color: colors.text },
  reviewComment: { ...typography.small, color: colors.textMuted, marginTop: 2 },
});
