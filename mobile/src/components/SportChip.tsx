import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing } from '../theme/theme';
import { SPORTS } from '../theme/theme';

export function SportChip({
  sport,
  selected,
  onPress,
}: {
  sport: string;
  selected: boolean;
  onPress: () => void;
}) {
  const icon = SPORTS.find((s) => s.key === sport)?.icon ?? '🏅';
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.label, selected && styles.labelSelected]}>{sport}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.bgAlt,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  chipSelected: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  icon: { fontSize: 15 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  labelSelected: { color: colors.primaryDark },
});
