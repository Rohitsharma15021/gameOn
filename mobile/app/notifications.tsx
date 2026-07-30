import { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../src/components/Screen';
import { EmptyState } from '../src/components/EmptyState';
import { LoadingView } from '../src/components/LoadingView';
import { colors, spacing, typography } from '../src/theme/theme';
import { fetchNotifications, markNotificationsRead } from '../src/api/notifications';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  BOOKING_CONFIRMED: 'checkmark-circle',
  SPLIT_REQUEST: 'cash',
  SPLIT_PAID: 'cash',
  GAME_INVITE: 'megaphone',
  GAME_PLAYER_JOINED: 'person-add',
  GAME_JOIN_REQUEST: 'person-add',
  GAME_JOIN_APPROVED: 'checkmark-circle',
  GAME_REMOVED: 'person-remove',
  GAME_CANCELLED: 'close-circle',
  CHAT_MESSAGE: 'chatbubble',
};

export default function Notifications() {
  const qc = useQueryClient();
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetchNotifications(),
  });

  useEffect(() => {
    markNotificationsRead().then(() => qc.invalidateQueries({ queryKey: ['unread-count'] }));
  }, []);

  const onPress = (n: NonNullable<typeof data>['notifications'][number]) => {
    const data = (n.data ?? {}) as { gameId?: string; bookingId?: string; venueId?: string };
    if (data.gameId) router.push(`/game/${data.gameId}`);
    else if (data.bookingId) router.push('/(tabs)/bookings');
    else if (data.venueId) router.push(`/venue/${data.venueId}`);
  };

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 22 }} />
      </View>

      {isLoading ? (
        <LoadingView />
      ) : (
        <FlatList
          data={data?.notifications ?? []}
          keyExtractor={(n) => n.id}
          contentContainerStyle={styles.list}
          refreshing={isFetching}
          onRefresh={refetch}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => onPress(item)}>
              <View style={styles.iconWrap}>
                <Ionicons name={ICONS[item.type] ?? 'notifications'} size={18} color={colors.primaryDark} />
              </View>
              <View style={styles.body}>
                <Text style={styles.notifTitle}>{item.title}</Text>
                <Text style={styles.notifBody}>{item.body}</Text>
                <Text style={styles.time}>{new Date(item.createdAt).toLocaleString('en-IN')}</Text>
              </View>
              {!item.readAt && <View style={styles.unreadDot} />}
            </Pressable>
          )}
          ListEmptyComponent={<EmptyState icon="🔔" title="No notifications yet" />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { ...typography.h3, color: colors.text },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  notifTitle: { ...typography.bodyMedium, color: colors.text },
  notifBody: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  time: { ...typography.tiny, color: colors.textFaint, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
});
