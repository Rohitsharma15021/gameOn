import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { colors } from '../theme/theme';

export function LoadingView() {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
});
