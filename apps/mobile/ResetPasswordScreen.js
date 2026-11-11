import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ErrorText, PrimaryButton, TextLink } from './components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from './lib/supabase';
import BrandBug from './components/BrandBug';
import { colors, fonts } from './lib/theme';

export default function ResetPasswordScreen({ onComplete, onCancel }) {
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const updatePassword = async () => {
    if (loading) return;
    setMessage('');

    if (password.length < 8) {
      setMessage('Use at least 8 characters for your new password.');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('The passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      onComplete();
    } catch (error) {
      setMessage('We couldn’t update your password. Check your connection or request a new link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Ionicons name="key-outline" size={38} color={colors.primary} />
        <Text style={styles.title}>Choose a new password</Text>
        <Text style={styles.subtitle}>Use at least 8 characters. Choose a password you don’t use for another account.</Text>

        <Text style={styles.label}>New password</Text>
        <View style={styles.passwordRow}>
          <TextInput editable={!loading} selectionColor={colors.primary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            textContentType="newPassword"
            autoCapitalize="none"
            style={styles.passwordInput}
            accessibilityLabel="New password"
          />
          <TouchableOpacity
            onPress={() => setShowPassword((visible) => !visible)}
            style={styles.eyeButton}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <BrandBug kind="bee" size={26} style={{ opacity: showPassword ? 1 : 0.6 }} />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Confirm new password</Text>
        <TextInput editable={!loading} selectionColor={colors.primary}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showPassword}
          textContentType="newPassword"
          autoCapitalize="none"
          style={styles.input}
          accessibilityLabel="Confirm new password"
        />

        <ErrorText style={styles.message}>{message}</ErrorText>

        <PrimaryButton label="Save password" busy={loading} busyLabel="Saving password…" onPress={updatePassword} accessibilityLabel="Save new password" style={styles.button} />
        {onCancel ? <TextLink label="Not now" disabled={loading} onPress={onCancel} style={styles.cancelButton} /> : null}
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 20,
  },
  card: { backgroundColor: colors.white, width: '100%', maxWidth: 480, alignSelf: 'center' },
  title: { fontSize: 24, lineHeight: 31, fontFamily: fonts.heading, color: colors.ink, marginTop: 16 },
  subtitle: { fontSize: 15, lineHeight: 21, color: colors.muted, marginTop: 8, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '700', color: colors.ink, marginTop: 12, marginBottom: 7 },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.white,
  },
  passwordRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  passwordInput: { flex: 1, paddingHorizontal: 14 },
  eyeButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  message: { marginTop: 14 },
  button: { marginTop: 20 },
  cancelButton: { marginTop: 8 },
});
