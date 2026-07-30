import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from '../../src/lib/alert';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { Avatar } from '../../src/components/Avatar';
import { LoadingView } from '../../src/components/LoadingView';
import { colors, radius, spacing, typography, SKILL_LABELS, SPORTS } from '../../src/theme/theme';
import { fetchGame, joinGame, leaveGame, approvePlayer, updateGame } from '../../src/api/games';
import { useAuthStore } from '../../src/store/auth.store';
import { dayLabel, money, timeRange } from '../../src/utils/format';

export default function GameDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: game, isLoading } = useQuery({ queryKey: ['game', id], queryFn: () => fetchGame(id) });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['game', id] });

  if (isLoading || !game) return <LoadingView />;

  const icon = SPORTS.find((s) => s.key === game.sport)?.icon ?? '🏅';
  const joined = game.players.filter((p) => p.status === 'JOINED');
  const requested = game.players.filter((p) => p.status === 'REQUESTED');

  const onJoin = async () => {
    setBusy(true);
    try {
      const { pendingApproval } = await joinGame(id);
      Alert.alert(pendingApproval ? 'Request sent' : "You're in! 🎉", pendingApproval ? 'The host will approve your request soon.' : 'See you on the field.');
      invalidate();
    } catch (err) {
      Alert.alert('Could not join', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onLeave = async () => {
    Alert.alert('Leave this game?', undefined, [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await leaveGame(id, user!.id);
            invalidate();
          } catch (err) {
            Alert.alert('Could not leave', (err as Error).message);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const onCancelGame = async () => {
    Alert.alert('Cancel this game?', 'All joined players will be notified.', [
      { text: 'Keep game', style: 'cancel' },
      {
        text: 'Cancel game',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await updateGame(id, { status: 'CANCELLED' });
            invalidate();
          } catch (err) {
            Alert.alert('Could not cancel', (err as Error).message);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const onApprove = async (userId: string) => {
    try {
      await approvePlayer(id, userId);
      invalidate();
    } catch (err) {
      Alert.alert('Could not approve', (err as Error).message);
    }
  };

  return (
    <Screen scroll>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Pressable onPress={() => router.push(`/game/${id}/chat`)} style={styles.chatBtn}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
          <Text style={styles.chatBtnText}>Chat</Text>
        </Pressable>
      </View>

      <Text style={styles.sport}>{icon} {game.sport}</Text>
      {game.title ? <Text style={styles.title}>{game.title}</Text> : null}

      <View style={styles.infoCard}>
        <InfoRow icon="calendar-outline" text={`${dayLabel(game.startsAt)} · ${timeRange(game.startsAt, game.endsAt)}`} />
        {game.locationName ? <InfoRow icon="location-outline" text={game.locationName} /> : null}
        <InfoRow icon="people-outline" text={`${joined.length}/${game.maxPlayers} players · ${SKILL_LABELS[game.skillLevel]}`} />
        <InfoRow icon="cash-outline" text={game.costPerPlayer > 0 ? `${money(game.costPerPlayer)}/player` : 'Free'} />
      </View>

      {game.description ? <Text style={styles.description}>{game.description}</Text> : null}

      <View style={styles.hostRow}>
        <Avatar uri={game.host.avatarUrl} name={game.host.name} size={40} />
        <View>
          <Text style={styles.hostLabel}>Hosted by</Text>
          <Pressable onPress={() => router.push(`/player/${game.host.id}`)}>
            <Text style={styles.hostName}>{game.host.name}</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Players ({joined.length})</Text>
      <FlatList
        data={joined}
        keyExtractor={(p) => p.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <Pressable style={styles.playerRow} onPress={() => router.push(`/player/${item.user.id}`)}>
            <Avatar uri={item.user.avatarUrl} name={item.user.name} size={32} />
            <Text style={styles.playerName}>{item.user.name}</Text>
            <Text style={styles.playerSkill}>{SKILL_LABELS[item.user.skillLevel]}</Text>
          </Pressable>
        )}
      />

      {game.isHost && requested.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Join requests ({requested.length})</Text>
          {requested.map((p) => (
            <View key={p.id} style={styles.playerRow}>
              <Avatar uri={p.user.avatarUrl} name={p.user.name} size={32} />
              <Text style={styles.playerName}>{p.user.name}</Text>
              <Pressable onPress={() => onApprove(p.userId)} style={styles.approveBtn}>
                <Text style={styles.approveBtnText}>Approve</Text>
              </Pressable>
            </View>
          ))}
        </>
      )}

      <View style={styles.actions}>
        {game.status === 'CANCELLED' ? (
          <Text style={styles.cancelledText}>This game was cancelled</Text>
        ) : game.isHost ? (
          <Button title="Cancel game" variant="danger" onPress={onCancelGame} loading={busy} />
        ) : game.myStatus === 'JOINED' ? (
          <Button title="Leave game" variant="outline" onPress={onLeave} loading={busy} />
        ) : game.myStatus === 'REQUESTED' ? (
          <Button title="Request pending..." variant="outline" onPress={() => {}} disabled />
        ) : (
          <Button title={game.spotsLeft > 0 ? 'Join game' : 'Game full'} onPress={onJoin} loading={busy} disabled={game.spotsLeft <= 0} />
        )}
      </View>
    </Screen>
  );
}

function InfoRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primaryLight, borderRadius: radius.full, paddingVertical: 6, paddingHorizontal: spacing.md },
  chatBtnText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  sport: { ...typography.bodyMedium, color: colors.textMuted, marginTop: spacing.lg },
  title: { ...typography.h1, color: colors.text, marginTop: 2 },
  infoCard: { backgroundColor: colors.bgAlt, borderRadius: radius.lg, padding: spacing.md, marginTop: spacing.lg, gap: spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoText: { ...typography.small, color: colors.text },
  description: { ...typography.body, color: colors.text, marginTop: spacing.lg },
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
  hostLabel: { ...typography.tiny, color: colors.textMuted },
  hostName: { ...typography.bodyMedium, color: colors.primaryDark },
  sectionTitle: { ...typography.h3, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.sm },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  playerName: { ...typography.body, color: colors.text, flex: 1 },
  playerSkill: { ...typography.tiny, color: colors.textMuted },
  approveBtn: { backgroundColor: colors.primary, borderRadius: radius.full, paddingVertical: 6, paddingHorizontal: spacing.md },
  approveBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  actions: { marginTop: spacing.xl, marginBottom: spacing.xl },
  cancelledText: { ...typography.body, color: colors.danger, textAlign: 'center' },
});
