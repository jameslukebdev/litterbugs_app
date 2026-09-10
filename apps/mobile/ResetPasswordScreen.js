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

import SteadyButtonContent from './components/SteadyButtonContent';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from './lib/supabase';

export default function ResetPasswordScreen({ onComplete }) {
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
        <Ionicons name="key-outline" size={38} color="#2F7D32" />
        <Text style={styles.title}>Choose a new password</Text>
        <Text style={styles.subtitle}>Use at least 8 characters. Choose a password you don’t use for another account.</Text>

        <Text style={styles.label}>New password</Text>
        <View style={styles.passwordRow}>
          <TextInput editable={!loading} selectionColor="#2F7D32"
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
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#666" />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Confirm new password</Text>
        <TextInput editable={!loading} selectionColor="#2F7D32"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showPassword}
          textContentType="newPassword"
          autoCapitalize="none"
          style={styles.input}
          accessibilityLabel="Confirm new password"
        />

        {!!message && <Text accessibilityRole="alert" style={styles.message}>{message}</Text>}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={updatePassword}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Save new password"
        >
          <SteadyButtonContent label="Save password" busy={loading} busyLabel="Saving password…" />
        </TouchableOpacity>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
  },
  card: { backgroundColor: '#FFFFFF', width: '100%', maxWidth: 480, alignSelf: 'center' },
  title: { fontSize: 24, lineHeight: 31, fontWeight: '600', color: '#333', marginTop: 16 },
  subtitle: { fontSize: 15, lineHeight: 21, color: '#666', marginTop: 8, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '700', color: '#333', marginTop: 12, marginBottom: 7 },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#D8DDE2',
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
  },
  passwordRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D8DDE2',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  passwordInput: { flex: 1, paddingHorizontal: 14 },
  eyeButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  message: { color: '#B42318', marginTop: 14, lineHeight: 20 },
  button: {
    minHeight: 50,
    marginTop: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2F7D32',
  },
  buttonDisabled: { opacity: 0.65 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
