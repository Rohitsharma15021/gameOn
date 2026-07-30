import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from '../../src/lib/alert';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { colors, radius, spacing, typography, SPORTS, SKILL_LABELS } from '../../src/theme/theme';
import { updateProfile } from '../../src/api/users';
import { useAuthStore } from '../../src/store/auth.store';
import type { SkillLevel } from '../../src/types/api';

const SKILLS: SkillLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PRO'];

export default function Settings() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const signOut = useAuthStore((s) => s.signOut);

  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [sports, setSports] = useState<string[]>(user?.sportPreferences ?? []);
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(user?.skillLevel ?? 'BEGINNER');
  const [pushEnabled, setPushEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  const toggleSport = (key: string) =>
    setSports((prev) => (prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]));

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateProfile({ name, bio, city, sportPreferences: sports, skillLevel });
      await updateUser(updated);
      Alert.alert('Profile updated');
    } catch (err) {
      Alert.alert('Could not save', (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 22 }} />
      </View>

      <Text style={styles.label}>Name</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} />

      <Text style={styles.label}>Bio</Text>
      <TextInput value={bio} onChangeText={setBio} style={[styles.input, styles.multiline]} multiline placeholder="Tell other players about yourself" />

      <Text style={styles.label}>City</Text>
      <TextInput value={city} onChangeText={setCity} style={styles.input} />

      <Text style={styles.label}>Sports you play</Text>
      <View style={styles.chipRow}>
        {SPORTS.map((s) => {
          const selected = sports.includes(s.key);
          return (
            <Pressable key={s.key} onPress={() => toggleSport(s.key)} style={[styles.chip, selected && styles.chipActive]}>
              <Text style={styles.chipIcon}>{s.icon}</Text>
              <Text style={[styles.chipText, selected && styles.chipTextActive]}>{s.key}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Skill level</Text>
      <View style={styles.chipRow}>
        {SKILLS.map((level) => (
          <Pressable key={level} onPress={() => setSkillLevel(level)} style={[styles.pill, skillLevel === level && styles.pillActive]}>
            <Text style={[styles.pillText, skillLevel === level && styles.pillTextActive]}>{SKILL_LABELS[level]}</Text>
          </Pressable>
        ))}
      </View>

      <Button title="Save changes" onPress={save} loading={saving} style={styles.saveBtn} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Push notifications</Text>
          <Switch value={pushEnabled} onValueChange={setPushEnabled} trackColor={{ true: colors.primary }} />
        </View>
      </View>

      <Text style={styles.version}>gameOn v1.0.0</Text>

      <Pressable onPress={signOut} style={styles.signOutBtn}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { ...typography.h3, color: colors.text },
  label: { ...typography.bodyMedium, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 15, color: colors.text },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
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
  saveBtn: { marginTop: spacing.xl },
  section: { marginTop: spacing.xxl },
  sectionTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.sm },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel: { ...typography.body, color: colors.text },
  version: { ...typography.small, color: colors.textFaint, textAlign: 'center', marginTop: spacing.xxl },
  signOutBtn: { marginTop: spacing.lg, marginBottom: spacing.xl, alignItems: 'center' },
  signOutText: { ...typography.bodyMedium, color: colors.danger },
});
