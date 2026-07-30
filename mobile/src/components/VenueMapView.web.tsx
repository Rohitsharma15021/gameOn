import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme/theme';
import type { Venue } from '../types/api';

/**
 * Web build of the map toggle. react-native-maps has no web target and even
 * importing it crashes the web bundle at module-load time, so this sibling
 * file (picked automatically by Metro for platform === 'web') never imports
 * it — see VenueMapView.native.tsx for the real map.
 */
export function VenueMapView({ venues: _venues, center: _center }: { venues: Venue[]; center: unknown }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Map view is available in the iOS/Android app.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  text: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
