import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert } from '../../src/lib/alert';
import { Screen } from '../../src/components/Screen';
import { Button } from '../../src/components/Button';
import { colors, spacing, typography } from '../../src/theme/theme';
import { verifyOtp, requestOtp } from '../../src/api/auth';
import { useAuthStore } from '../../src/store/auth.store';

export default function Verify() {
  const { phone, devCode } = useLocalSearchParams<{ phone: string; devCode?: string }>();
  const [code, setCode] = useState(devCode || '');
  const [loading, setLoading] = useState(false);
  const signIn = useAuthStore((s) => s.signIn);

  const submit = async () => {
    if (code.length < 4) {
      Alert.alert('Enter the code you received');
      return;
    }
    setLoading(true);
    try {
      const result = await verifyOtp(phone, code);
      await signIn(result.token, result.user);
      router.replace(result.needsOnboarding ? '/onboarding/profile-setup' : '/(tabs)/home');
    } catch (err) {
      Alert.alert('Verification failed', (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await requestOtp(phone);
      Alert.alert('Code sent', `A new code was sent to ${phone}`);
    } catch (err) {
      Alert.alert('Could not resend', (err as Error).message);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Enter the code</Text>
      <Text style={styles.subtitle}>We sent a 6-digit code to {phone}</Text>

      <TextInput
        value={code}
        onChangeText={setCode}
        placeholder="••••••"
        keyboardType="number-pad"
        style={styles.input}
        maxLength={6}
        autoFocus
      />

      {devCode ? <Text style={styles.hint}>Dev mode: code pre-filled ({devCode})</Text> : null}

      <Button title="Verify & continue" onPress={submit} loading={loading} style={styles.button} />
      <Text style={styles.resend} onPress={resend}>
        Didn't get it? Resend code
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h2, color: colors.text, marginTop: spacing.xl },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 24,
    letterSpacing: 8,
    color: colors.text,
    textAlign: 'center',
  },
  hint: { ...typography.small, color: colors.warning, marginTop: spacing.sm, textAlign: 'center' },
  button: { marginTop: spacing.xl },
  resend: { ...typography.bodyMedium, color: colors.primary, textAlign: 'center', marginTop: spacing.lg },
});
