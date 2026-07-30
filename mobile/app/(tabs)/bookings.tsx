import { useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from '../../src/lib/alert';
import { Screen } from '../../src/components/Screen';
import { EmptyState } from '../../src/components/EmptyState';
import { LoadingView } from '../../src/components/LoadingView';
import { colors, radius, spacing, typography } from '../../src/theme/theme';
import { fetchBookings, cancelBooking } from '../../src/api/bookings';
import { dayLabel, money, timeRange } from '../../src/utils/format';
import type { Booking } from '../../src/types/api';

type Tab = 'upcoming' | 'past';

export default function Bookings() {
  const [tab, setTab] = useState<Tab>('upcoming');
  const qc = useQueryClient();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['bookings', tab],
    queryFn: () => fetchBookings(tab),
  });

  const onCancel = (booking: Booking) => {
    Alert.alert('Cancel booking?', 'Refunds apply only if cancelled 12+ hours before start.', [
      { text: 'Keep booking', style: 'cancel' },
      {
        text: 'Cancel booking',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await cancelBooking(booking.id);
            Alert.alert(res.refund.eligible ? 'Refunded' : 'Cancelled', res.refund.reason ?? 'Your refund is on its way.');
            qc.invalidateQueries({ queryKey: ['bookings'] });
          } catch (err) {
            Alert.alert('Could not cancel', (err as Error).message);
          }
        },
      },
    ]);
  };

  return (
    <Screen padded={false}>
      <Text style={styles.title}>My Bookings</Text>
      <View style={styles.segment}>
        <Pressable onPress={() => setTab('upcoming')} style={[styles.segmentBtn, tab === 'upcoming' && styles.segmentBtnActive]}>
          <Text style={[styles.segmentText, tab === 'upcoming' && styles.segmentTextActive]}>Upcoming</Text>
        </Pressable>
        <Pressable onPress={() => setTab('past')} style={[styles.segmentBtn, tab === 'past' && styles.segmentBtnActive]}>
          <Text style={[styles.segmentText, tab === 'past' && styles.segmentTextActive]}>Past</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <LoadingView />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.list}
          refreshing={isFetching}
          onRefresh={refetch}
          renderItem={({ item }) => (
            <BookingCard booking={item} onCancel={() => onCancel(item)} canCancel={tab === 'upcoming'} />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="📆"
              title={tab === 'upcoming' ? 'No upcoming bookings' : 'No past bookings'}
              subtitle={tab === 'upcoming' ? 'Book a court to see it here' : 'Your booking history will show up here'}
            />
          }
        />
      )}
    </Screen>
  );
}

function BookingCard({ booking, onCancel, canCancel }: { booking: Booking; onCancel: () => void; canCancel: boolean }) {
  const venue = booking.slot.court.venue;
  const statusColor =
    booking.status === 'CANCELLED' ? colors.danger : booking.status === 'CONFIRMED' ? colors.primary : colors.warning;

  return (
    <Pressable
      style={styles.card}
      onPress={() => venue?.id && router.push(`/venue/${venue.id}`)}
    >
      <Image source={{ uri: venue?.images?.[0] || 'https://picsum.photos/seed/booking/400/300' }} style={styles.image} />
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.venueName} numberOfLines={1}>{venue?.name}</Text>
          <Text style={[styles.status, { color: statusColor }]}>{booking.status}</Text>
        </View>
        <Text style={styles.court}>{booking.slot.court.name}</Text>
        <Text style={styles.when}>{dayLabel(booking.slot.startsAt)} · {timeRange(booking.slot.startsAt, booking.slot.endsAt)}</Text>
        <View style={styles.footerRow}>
          <Text style={styles.amount}>{money(booking.amount)}</Text>
          {booking.splits.length > 1 ? (
            <Text style={styles.split}>Split {booking.splits.length} ways</Text>
          ) : null}
        </View>
        {canCancel && booking.status !== 'CANCELLED' ? (
          <Pressable onPress={onCancel} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel booking</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h2, color: colors.text, paddingHorizontal: spacing.lg, marginTop: spacing.md },
  segment: { flexDirection: 'row', backgroundColor: colors.bgAlt, borderRadius: radius.md, marginHorizontal: spacing.lg, marginTop: spacing.md, padding: 4 },
  segmentBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: colors.surface },
  segmentText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  segmentTextActive: { color: colors.text },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  card: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: spacing.md },
  image: { width: 96, height: '100%', backgroundColor: colors.bgAlt },
  cardBody: { flex: 1, padding: spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  venueName: { ...typography.bodyMedium, flex: 1, color: colors.text },
  status: { fontSize: 11, fontWeight: '700' },
  court: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  when: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  amount: { ...typography.bodyMedium, color: colors.primaryDark },
  split: { fontSize: 11, color: colors.textMuted },
  cancelBtn: { marginTop: spacing.sm },
  cancelText: { fontSize: 12, fontWeight: '700', color: colors.danger },
});
