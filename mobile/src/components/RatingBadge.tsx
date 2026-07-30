import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme/theme';

export function RatingBadge({ rating, count }: { rating: number; count?: number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.star}>★</Text>
      <Text style={styles.rating}>{rating > 0 ? rating.toFixed(1) : 'New'}</Text>
      {count != null && count > 0 ? <Text style={styles.count}>({count})</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  star: { color: colors.star, fontSize: 13 },
  rating: { fontSize: 13, fontWeight: '700', color: colors.text },
  count: { fontSize: 12, color: colors.textMuted, marginLeft: spacing.xs },
});
