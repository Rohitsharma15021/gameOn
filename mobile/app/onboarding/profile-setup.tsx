import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { Alert } from '../../src/lib/alert';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { colors, radius, spacing, typography, SPORTS, SKILL_LABELS } from '../../src/theme/theme';
import { completeOnboarding } from '../../src/api/users';
import { useAuthStore } from '../../src/store/auth.store';
import type { SkillLevel } from '../../src/types/api';

const SKILLS: SkillLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PRO'];

export default function ProfileSetup() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [name, setName] = useState(user?.name === 'Player' ? '' : user?.name ?? '');
  const [sports, setSports] = useState<string[]>([]);
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('BEGINNER');
  const [city, setCity] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggleSport = (key: string) => {
    setSports((prev) => (prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]));
  };

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Enable location access to auto-fill your city.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      const places = await Location.reverseGeocodeAsync(pos.coords);
      if (places[0]?.city) setCity(places[0].city);
    } catch {
      Alert.alert('Could not detect location', 'You can still enter your city manually.');
    } finally {
      setLocating(false);
    }
  };

  const submit = async () => {
    if (!name.trim()) {
      Alert.alert('Add your name to continue');
      return;
    }
    if (sports.length === 0) {
      Alert.alert('Pick at least one sport you play');
      return;
    }
    setSaving(true);
    try {
      const updated = await completeOnboarding({
        name: name.trim(),
        sportPreferences: sports,
        skillLevel,
        city: city || undefined,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      });
      await updateUser(updated);
      router.replace('/(tabs)/home');
    } catch (err) {
      Alert.alert('Could not save profile', (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>Tell us about your game</Text>
      <Text style={styles.subtitle}>This helps us match you with the right players and venues.</Text>

      <Text style={styles.label}>Your name</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Full name" style={styles.input} />

      <Text style={styles.label}>Sports you play</Text>
      <View style={styles.grid}>
        {SPORTS.map((s) => {
          const selected = sports.includes(s.key);
          return (
            <Pressable
              key={s.key}
              onPress={() => toggleSport(s.key)}
              style={[styles.sportTile, selected && styles.sportTileSelected]}
            >
              <Text style={styles.sportIcon}>{s.icon}</Text>
              <Text style={[styles.sportLabel, selected && styles.sportLabelSelected]}>{s.key}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Your skill level</Text>
      <View style={styles.skillRow}>
        {SKILLS.map((level) => {
          const selected = skillLevel === level;
          return (
            <Pressable
              key={level}
              onPress={() => setSkillLevel(level)}
              style={[styles.skillPill, selected && styles.skillPillSelected]}
            >
              <Text style={[styles.skillText, selected && styles.skillTextSelected]}>
                {SKILL_LABELS[level]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>City</Text>
      <View style={styles.inputRow}>
        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder="e.g. Bengaluru"
          style={[styles.input, styles.inputFlex]}
        />
        <Pressable onPress={useMyLocation} style={styles.locateBtn}>
          <Text style={styles.locateBtnText}>{locating ? '...' : '📍 Use GPS'}</Text>
        </Pressable>
      </View>

      <Button title="Finish setup" onPress={submit} loading={saving} style={styles.button} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h2, color: colors.text, marginTop: spacing.md },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg },
  label: { ...typography.bodyMedium, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  inputRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  inputFlex: { flex: 1 },
  locateBtn: { paddingHorizontal: spacing.md, paddingVertical: 12, backgroundColor: colors.bgAlt, borderRadius: radius.md },
  locateBtnText: { fontSize: 13, fontWeight: '600', color: colors.primaryDark },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sportTile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  sportTileSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  sportIcon: { fontSize: 24 },
  sportLabel: { fontSize: 12, fontWeight: '600', color: colors.textMuted, textAlign: 'center' },
  sportLabelSelected: { color: colors.primaryDark },
  skillRow: { flexDirection: 'row', gap: spacing.sm },
  skillPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  skillPillSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  skillText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  skillTextSelected: { color: colors.primaryDark },
  button: { marginTop: spacing.xxl, marginBottom: spacing.xl },
});
