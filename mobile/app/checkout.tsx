import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from '../src/lib/alert';
import { Screen } from '../src/components/Screen';
import { Button } from '../src/components/Button';
import { colors, radius, spacing, typography } from '../src/theme/theme';
import { createBooking, confirmBooking } from '../src/api/bookings';
import { money, timeRange, dayLabel } from '../src/utils/format';

interface FriendRow {
  name: string;
  phone: string;
}

export default function Checkout() {
  const params = useLocalSearchParams<{
    slotId: string;
    venueName: string;
    courtName: string;
    startsAt: string;
    endsAt: string;
    price: string;
  }>();
  const price = Number(params.price);

  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const shares = price ? splitPreview(price, friends.length + 1) : [];

  const addFriend = () => setFriends((f) => [...f, { name: '', phone: '' }]);
  const updateFriend = (i: number, patch: Partial<FriendRow>) =>
    setFriends((f) => f.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  const removeFriend = (i: number) => setFriends((f) => f.filter((_, idx) => idx !== i));

  const pay = async () => {
    setLoading(true);
    try {
      const validFriends = friends.filter((f) => f.phone.trim().length >= 6);
      const { booking, payment } = await createBooking({
        slotId: params.slotId,
        notes: notes || undefined,
        splitWith: validFriends.map((f) => ({ name: f.name || undefined, phone: f.phone })),
      });

      if (payment.provider === 'mock' && payment.autoSettle) {
        await confirmBooking(booking.id);
        Alert.alert('Booking confirmed 🎉', 'Your slot is reserved. Want to turn this into an open game?', [
          { text: 'Not now', style: 'cancel', onPress: () => router.replace('/(tabs)/bookings') },
          {
            text: 'Host a game',
            onPress: () =>
              router.replace({ pathname: '/game/new', params: { bookingId: booking.id } }),
          },
        ]);
      } else {
        Alert.alert(
          'Payment gateway not configured',
          `This build uses the ${payment.provider} driver. Wire up native ${payment.provider} checkout SDK to collect real payment; the booking hold has been created.`,
        );
        router.replace('/(tabs)/bookings');
      }
    } catch (err) {
      Alert.alert('Booking failed', (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Confirm & pay</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.venue}>{params.venueName}</Text>
        <Text style={styles.court}>{params.courtName}</Text>
        <Text style={styles.when}>
          {dayLabel(params.startsAt)} · {timeRange(params.startsAt, params.endsAt)}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Split the cost (optional)</Text>
      <Text style={styles.hint}>Add friends and each of you pays your own share.</Text>
      {friends.map((f, i) => (
        <View key={i} style={styles.friendRow}>
          <TextInput
            value={f.name}
            onChangeText={(v) => updateFriend(i, { name: v })}
            placeholder="Name"
            style={[styles.input, styles.nameInput]}
          />
          <TextInput
            value={f.phone}
            onChangeText={(v) => updateFriend(i, { phone: v })}
            placeholder="Phone"
            keyboardType="phone-pad"
            style={[styles.input, styles.phoneInput]}
          />
          <Pressable onPress={() => removeFriend(i)}>
            <Ionicons name="close-circle" size={22} color={colors.textFaint} />
          </Pressable>
        </View>
      ))}
      <Pressable onPress={addFriend} style={styles.addFriend}>
        <Ionicons name="add" size={16} color={colors.primary} />
        <Text style={styles.addFriendText}>Add a friend</Text>
      </Pressable>

      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Notes for the venue (optional)"
        style={[styles.input, styles.notesInput]}
        multiline
      />

      <View style={styles.priceCard}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Total</Text>
          <Text style={styles.priceValue}>{money(price)}</Text>
        </View>
        {shares.length > 1 && (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Your share</Text>
            <Text style={styles.priceValue}>{money(shares[0])}</Text>
          </View>
        )}
      </View>

      <Button title={`Pay ${money(shares[0] ?? price)}`} onPress={pay} loading={loading} style={styles.payButton} />
    </Screen>
  );
}

function splitPreview(total: number, parts: number) {
  const base = Math.floor(total / parts);
  const remainder = total - base * parts;
  return Array.from({ length: parts }, (_, i) => base + (i < remainder ? 1 : 0));
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...typography.h3, color: colors.text },
  summaryCard: { backgroundColor: colors.bgAlt, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.lg },
  venue: { ...typography.h3, color: colors.text },
  court: { ...typography.body, color: colors.textMuted, marginTop: 2 },
  when: { ...typography.small, color: colors.textMuted, marginTop: spacing.xs },
  sectionTitle: { ...typography.bodyMedium, color: colors.text, marginTop: spacing.xl },
  hint: { ...typography.small, color: colors.textMuted, marginTop: 2, marginBottom: spacing.sm },
  friendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 10, fontSize: 14, color: colors.text },
  nameInput: { flex: 1 },
  phoneInput: { flex: 1 },
  addFriend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
  addFriendText: { ...typography.small, color: colors.primary, fontWeight: '700' },
  notesInput: { marginTop: spacing.lg, minHeight: 60, textAlignVertical: 'top' },
  priceCard: { backgroundColor: colors.bgAlt, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.xl, gap: spacing.xs },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  priceLabel: { ...typography.body, color: colors.textMuted },
  priceValue: { ...typography.bodyMedium, color: colors.text },
  payButton: { marginTop: spacing.xl, marginBottom: spacing.xl },
});
