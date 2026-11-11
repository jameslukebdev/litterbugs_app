import { useState } from 'react';
import { userMessage } from './lib/userMessage';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';

import ProfileAvatar from './ProfileAvatar';
import { ErrorText, PrimaryButton, TextLink } from './components/ui';
import { signOut } from './lib/auth';
import { useProfile } from './lib/profile';
import { showAvatarSourceMenu, uploadProfileAvatar } from './lib/profileAvatar';
import { useReports } from './lib/reports';
import { useSession } from './lib/session';
import { colors, fonts } from './lib/theme';

export default function CompleteProfileScreen({ navigation }) {
  const { user } = useSession();
  const { profile, updateProfile } = useProfile();
  const { refreshReports } = useReports();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [avatarAsset, setAvatarAsset] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    const cleanName = displayName.trim();
    if (!cleanName) {
      setError('Enter the name you want people to see.');
      return;
    }
    if (cleanName.length > 60) {
      setError('Use 60 characters or fewer.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      let avatarPath = profile?.avatar_path ?? null;
      if (avatarAsset) avatarPath = await uploadProfileAvatar(user.id, avatarAsset);
      await updateProfile({ display_name: cleanName, avatar_path: avatarPath });
      await refreshReports();
      navigation.replace('App', { screen: 'Map' });
    } catch (saveError) {
      console.log('Complete profile error:', saveError);
      setError(userMessage(saveError, 'Your profile could not be saved. Try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>How should neighbors know you?</Text>
        <Text style={styles.subtitle}>Choose the name your community will see on your reports and cleanups. You can add a photo now or later.</Text>

        <TouchableOpacity
          style={styles.avatarButton}
          onPress={() => showAvatarSourceMenu({
            onAsset: setAvatarAsset,
            canRemove: Boolean(avatarAsset),
            onRemove: () => setAvatarAsset(null),
          })}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Add profile photo"
        >
          <ProfileAvatar profile={{ ...profile, display_name: displayName }} previewUri={avatarAsset?.uri} size={80} />
          <Text style={styles.avatarAction}>{avatarAsset ? 'Change photo' : 'Add photo'}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Display name</Text>
        <TextInput
          editable={!saving}
          selectionColor={colors.primary}
          value={displayName}
          onChangeText={(value) => { setDisplayName(value); setError(''); }}
          placeholder="Your name"
          maxLength={60}
          autoCapitalize="words"
          autoComplete="name"
          style={[styles.input, error && styles.inputError]}
          accessibilityLabel="Display name"
        />
        <Text style={styles.counter}>{displayName.length}/60</Text>
        <ErrorText style={styles.error}>{error}</ErrorText>

        <PrimaryButton label="Continue" busy={saving} busyLabel="Saving profile…" onPress={save} style={styles.primaryButton} />

        <TextLink tone="muted" label="Sign out" disabled={saving} style={styles.signOutButton} onPress={async () => { try { const result = await signOut(); if (result.error) throw result.error; } catch { setError('Couldn’t sign out. Check your connection and try again.'); } }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { flexGrow: 1, padding: 20, alignItems: 'stretch' },
  title: { marginTop: 18, color: colors.ink, fontSize: 24, lineHeight: 31, fontFamily: fonts.heading },
  subtitle: { maxWidth: 340, marginTop: 9, color: colors.muted, fontSize: 15, lineHeight: 22 },
  avatarButton: { flexDirection: 'row', gap: 16, alignItems: 'center', padding: 16, borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.white, marginVertical: 24 },
  avatarAction: { marginTop: 9, color: colors.primary, fontSize: 15, fontWeight: '600' },
  label: { width: '100%', maxWidth: 420, marginBottom: 7, color: colors.ink, fontSize: 14, fontWeight: '600' },
  input: { width: '100%', maxWidth: 420, minHeight: 52, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.white, color: colors.ink, fontSize: 16 },
  inputError: { borderColor: colors.red },
  counter: { width: '100%', maxWidth: 420, marginTop: 5, color: colors.muted, fontSize: 12, textAlign: 'right' },
  error: { width: '100%', maxWidth: 420 },
  primaryButton: { width: '100%', maxWidth: 420, marginTop: 24 },
  signOutButton: { marginTop: 8 },
});
