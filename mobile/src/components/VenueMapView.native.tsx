import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { router } from 'expo-router';
import { colors, radius, spacing, typography } from '../theme/theme';
import { money } from '../utils/format';
import type { Venue } from '../types/api';

/**
 * Native (iOS/Android) map. react-native-maps has no web build at all — even
 * a Platform.OS runtime check can't help because importing the module itself
 * crashes the web bundle. The .web.tsx sibling file is what Metro loads for
 * web instead; this file is never bundled there.
 */
export function VenueMapView({
  venues,
  center,
}: {
  venues: Venue[];
  center: { latitude: number; longitude: number } | null;
}) {
  const [selected, setSelected] = useState<Venue | null>(null);
  const mapRef = useRef<MapView>(null);

  const initialRegion = {
    latitude: center?.latitude ?? venues[0]?.latitude ?? 12.9716,
    longitude: center?.longitude ?? venues[0]?.longitude ?? 77.5946,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  };

  return (
    <View style={styles.flex}>
      <MapView
        ref={mapRef}
        style={styles.flex}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        showsUserLocation
        onPress={() => setSelected(null)}
      >
        {venues.map((v) => (
          <Marker
            key={v.id}
            coordinate={{ latitude: v.latitude, longitude: v.longitude }}
            onPress={() => setSelected(v)}
            pinColor={selected?.id === v.id ? colors.secondary : colors.primary}
          />
        ))}
      </MapView>

      {selected ? (
        <Pressable style={styles.card} onPress={() => router.push(`/venue/${selected.id}`)}>
          <Text style={styles.cardName} numberOfLines={1}>{selected.name}</Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {selected.address}
            {selected.startingPrice != null ? ` · From ${money(selected.startingPrice)}/hr` : ''}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  cardName: { ...typography.bodyMedium, color: colors.text },
  cardMeta: { ...typography.small, color: colors.textMuted, marginTop: 2 },
});
