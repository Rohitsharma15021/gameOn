import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Alert } from '../../src/lib/alert';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { colors, radius, spacing, typography, SPORTS, SKILL_LABELS } from '../../src/theme/theme';
import { createGame } from '../../src/api/games';
import type { SkillLevel } from '../../src/types/api';

const SKILLS: SkillLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PRO'];

export default function NewGame() {
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();

  const [title, setTitle] = useState('');
  const [sport, setSport] = useState(SPORTS[0].key);
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('BEGINNER');
  const [maxPlayers, setMaxPlayers] = useState('10');
  const [costPerPlayer, setCostPerPlayer] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [autoApprove, setAutoApprove] = useState(true);
  const [inviteNearby, setInviteNearby] = useState(true);
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2, 0, 0, 0);
    return d;
  });
  const [durationMins, setDurationMins] = useState(60);
  const [showPicker, setShowPicker] = useState<'date' | 'time' | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const max = parseInt(maxPlayers, 10);
    if (!bookingId && !locationName.trim()) {
      Alert.alert('Add a location name so players know where to go');
      return;
    }
    if (!max || max < 2) {
      Alert.alert('Enter a valid number of players (2 or more)');
      return;
    }

    setLoading(true);
    try {
      const endsAt = new Date(date.getTime() + durationMins * 60000);
      const game = await createGame({
        title: title || undefined,
        sport,
        skillLevel,
        maxPlayers: max,
        costPerPlayer: costPerPlayer ? Math.round(parseFloat(costPerPlayer) * 100) : 0,
        description: description || undefined,
        autoApprove,
        inviteNearby,
        bookingId: bookingId || undefined,
        startsAt: bookingId ? undefined : date.toISOString(),
        endsAt: bookingId ? undefined : endsAt.toISOString(),
        locationName: bookingId ? undefined : locationName,
      });
      router.replace(`/game/${game.id}`);
    } catch (err) {
      Alert.alert('Could not create game', (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>Host a game</Text>
      {bookingId ? (
        <Text style={styles.hint}>Using your recent booking for venue, court and time.</Text>
      ) : null}

      <Text style={styles.label}>Title (optional)</Text>
      <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Sunday morning kickabout" style={styles.input} />

      <Text style={styles.label}>Sport</Text>
      <View style={styles.chipRow}>
        {SPORTS.map((s) => (
          <Pressable key={s.key} onPress={() => setSport(s.key)} style={[styles.chip, sport === s.key && styles.chipActive]}>
            <Text style={styles.chipIcon}>{s.icon}</Text>
            <Text style={[styles.chipText, sport === s.key && styles.chipTextActive]}>{s.key}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Skill level</Text>
      <View style={styles.chipRow}>
        {SKILLS.map((level) => (
          <Pressable key={level} onPress={() => setSkillLevel(level)} style={[styles.pill, skillLevel === level && styles.pillActive]}>
            <Text style={[styles.pillText, skillLevel === level && styles.pillTextActive]}>{SKILL_LABELS[level]}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.label}>Max players</Text>
          <TextInput value={maxPlayers} onChangeText={setMaxPlayers} keyboardType="number-pad" style={styles.input} />
        </View>
        <View style={styles.half}>
          <Text style={styles.label}>Cost/player (₹)</Text>
          <TextInput value={costPerPlayer} onChangeText={setCostPerPlayer} keyboardType="decimal-pad" placeholder="0" style={styles.input} />
        </View>
      </View>

      {!bookingId && (
        <>
          <Text style={styles.label}>Where</Text>
          <TextInput
            value={locationName}
            onChangeText={setLocationName}
            placeholder="Venue or ground name"
            style={styles.input}
          />

          <Text style={styles.label}>When</Text>
          <View style={styles.row}>
            <Pressable style={[styles.input, styles.half]} onPress={() => setShowPicker('date')}>
              <Text style={styles.dateText}>{date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</Text>
            </Pressable>
            <Pressable style={[styles.input, styles.half]} onPress={() => setShowPicker('time')}>
              <Text style={styles.dateText}>{date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</Text>
            </Pressable>
          </View>
          {showPicker && (
            <DateTimePicker
              value={date}
              mode={showPicker}
              minimumDate={new Date()}
              onChange={(_, selected) => {
                setShowPicker(null);
                if (selected) setDate(selected);
              }}
            />
          )}

          <Text style={styles.label}>Duration</Text>
          <View style={styles.chipRow}>
            {[30, 60, 90, 120].map((m) => (
              <Pressable key={m} onPress={() => setDurationMins(m)} style={[styles.pill, durationMins === m && styles.pillActive]}>
                <Text style={[styles.pillText, durationMins === m && styles.pillTextActive]}>{m} min</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <Text style={styles.label}>Description (optional)</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Anything players should know"
        style={[styles.input, styles.multiline]}
        multiline
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Auto-approve join requests</Text>
        <Switch value={autoApprove} onValueChange={setAutoApprove} trackColor={{ true: colors.primary }} />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Invite nearby players</Text>
        <Switch value={inviteNearby} onValueChange={setInviteNearby} trackColor={{ true: colors.primary }} />
      </View>

      <Button title="Create game" onPress={submit} loading={loading} style={styles.submitBtn} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h2, color: colors.text, marginTop: spacing.md },
  hint: { ...typography.small, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.sm },
  label: { ...typography.bodyMedium, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    justifyContent: 'center',
  },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  dateText: { fontSize: 14, color: colors.text, fontWeight: '600' },
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  chipIcon: { fontSize: 14 },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: colors.primaryDark },
  pill: { paddingVertical: 8, paddingHorizontal: spacing.md, borderRadius: radius.full, backgroundColor: colors.bgAlt, borderWidth: 1, borderColor: colors.border },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  pillTextActive: { color: '#fff' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg },
  switchLabel: { ...typography.body, color: colors.text },
  submitBtn: { marginTop: spacing.xxl, marginBottom: spacing.xl },
});
