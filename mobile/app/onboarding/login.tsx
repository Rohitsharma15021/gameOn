import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Alert } from '../../src/lib/alert';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { colors, spacing, typography } from '../../src/theme/theme';
import { requestOtp } from '../../src/api/auth';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      Alert.alert('Enter a valid phone number');
      return;
    }
    setLoading(true);
    try {
      const result = await requestOtp(phone);
      router.push({ pathname: '/onboarding/verify', params: { phone: result.phone, devCode: result.devCode ?? '' } });
    } catch (err) {
      Alert.alert('Could not send code', (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>What's your number?</Text>
      <Text style={styles.subtitle}>We'll text you a code to verify it's you.</Text>

      <View style={styles.inputRow}>
        <Text style={styles.prefix}>+91</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="98765 43210"
          keyboardType="phone-pad"
          style={styles.input}
          maxLength={10}
          autoFocus
        />
      </View>

      <Button title="Send code" onPress={submit} loading={loading} style={styles.button} />

      <Text style={styles.altRow}>
        Or continue with Google / Apple — coming soon in this build.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h2, color: colors.text, marginTop: spacing.xl },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  prefix: { ...typography.bodyMedium, color: colors.textMuted, marginRight: spacing.sm },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: colors.text },
  button: { marginTop: spacing.xl },
  altRow: { ...typography.small, color: colors.textFaint, textAlign: 'center', marginTop: spacing.xl },
});
