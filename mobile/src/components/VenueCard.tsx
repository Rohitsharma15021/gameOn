import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, radius, spacing, typography } from '../theme/theme';
import { RatingBadge } from './RatingBadge';
import { distanceLabel, money } from '../utils/format';
import type { Venue } from '../types/api';

export function VenueCard({ venue }: { venue: Venue }) {
  return (
    <Pressable
      onPress={() => router.push(`/venue/${venue.id}`)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Image
        source={{ uri: venue.images[0] || 'https://picsum.photos/seed/placeholder/800/600' }}
        style={styles.image}
      />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>{venue.name}</Text>
          <RatingBadge rating={venue.ratingAvg} count={venue.ratingCount} />
        </View>
        <Text style={styles.address} numberOfLines={1}>{venue.address}</Text>
        <View style={styles.tagsRow}>
          {venue.sportsOffered.slice(0, 3).map((s) => (
            <View key={s} style={styles.tag}>
              <Text style={styles.tagText}>{s}</Text>
            </View>
          ))}
        </View>
        <View style={styles.footerRow}>
          {venue.startingPrice != null ? (
            <Text style={styles.price}>From {money(venue.startingPrice)}/hr</Text>
          ) : (
            <Text style={styles.price} />
          )}
          {distanceLabel(venue.distanceKm) ? (
            <Text style={styles.distance}>{distanceLabel(venue.distanceKm)}</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  pressed: { opacity: 0.9 },
  image: { width: '100%', height: 140, backgroundColor: colors.bgAlt },
  body: { padding: spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  name: { ...typography.h3, flex: 1, color: colors.text },
  address: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  tag: { backgroundColor: colors.bgAlt, borderRadius: radius.full, paddingVertical: 3, paddingHorizontal: spacing.sm },
  tagText: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  price: { ...typography.bodyMedium, color: colors.primaryDark },
  distance: { ...typography.small, color: colors.textMuted },
});
