import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import ProfileAvatar from './ProfileAvatar';
import { useProfile } from './lib/profile';
import {
  removeProfileAvatar,
  showAvatarSourceMenu,
  uploadProfileAvatar,
} from './lib/profileAvatar';
import { validateProfileDraft } from './lib/profileValidation';
import { useReports } from './lib/reports';
import { useSession } from './lib/session';

function FieldError({ children }) {
  return children ? <Text style={styles.error}>{children}</Text> : null;
}

export default function EditProfileScreen({ navigation }) {
  const { user } = useSession();
  const { profile, updateProfile } = useProfile();
  const { refreshReports } = useReports();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [location, setLocation] = useState(profile?.location || '');
  const [avatarAsset, setAvatarAsset] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const validation = validateProfileDraft({ displayName, username, bio, location });
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setSaving(true);
      setErrors({});
      let avatarPath = removeAvatar ? null : profile?.avatar_path ?? null;

      if (removeAvatar && profile?.avatar_path) await removeProfileAvatar(user.id);
      if (avatarAsset) avatarPath = await uploadProfileAvatar(user.id, avatarAsset);

      await updateProfile({ ...validation.values, avatar_path: avatarPath });
      await refreshReports();
      navigation.goBack();
    } catch (saveError) {
      console.log('Profile save error:', saveError);
      if (saveError.code === '23505' || /username.*unique/i.test(saveError.message || '')) {
        setErrors({ username: 'That username is taken.' });
      } else {
        Alert.alert('Couldn’t save profile', saveError.message || 'Check your connection and try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const setField = (setter, key) => (value) => {
    setter(value);
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity
          style={styles.avatarButton}
          onPress={() => showAvatarSourceMenu({
            onAsset: (asset) => { setAvatarAsset(asset); setRemoveAvatar(false); },
            canRemove: Boolean(avatarAsset || profile?.avatar_path),
            onRemove: () => { setAvatarAsset(null); setRemoveAvatar(true); },
          })}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Change profile photo"
        >
          <ProfileAvatar
            profile={removeAvatar ? { ...profile, avatar_path: null } : { ...profile, display_name: displayName }}
            previewUri={avatarAsset?.uri}
            size={104}
          />
          <Text style={styles.avatarAction}>Change photo</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Display name</Text>
        <TextInput value={displayName} onChangeText={setField(setDisplayName, 'displayName')} maxLength={60} autoCapitalize="words" style={[styles.input, errors.displayName && styles.inputError]} accessibilityLabel="Display name" />
        <Text style={styles.counter}>{displayName.length}/60</Text>
        <FieldError>{errors.displayName}</FieldError>

        <Text style={styles.label}>Username <Text style={styles.optional}>(optional)</Text></Text>
        <View style={[styles.usernameRow, errors.username && styles.inputError]}>
          <Text style={styles.at}>@</Text>
          <TextInput value={username} onChangeText={setField(setUsername, 'username')} maxLength={30} autoCapitalize="none" autoCorrect={false} style={styles.usernameInput} placeholder="cleanup.friend" accessibilityLabel="Username" />
        </View>
        <Text style={styles.counter}>{username.length}/30</Text>
        <FieldError>{errors.username}</FieldError>

        <Text style={styles.label}>Bio <Text style={styles.optional}>(optional)</Text></Text>
        <TextInput value={bio} onChangeText={setField(setBio, 'bio')} maxLength={160} multiline textAlignVertical="top" style={[styles.input, styles.multiline, errors.bio && styles.inputError]} placeholder="Tell your community a little about yourself." accessibilityLabel="Bio" />
        <Text style={styles.counter}>{bio.length}/160</Text>
        <FieldError>{errors.bio}</FieldError>

        <Text style={styles.label}>Location <Text style={styles.optional}>(optional)</Text></Text>
        <TextInput value={location} onChangeText={setField(setLocation, 'location')} maxLength={80} style={[styles.input, errors.location && styles.inputError]} placeholder="Asheville, NC" accessibilityLabel="Location" />
        <Text style={styles.helper}>This is public. Use a city or region, not a street address.</Text>
        <Text style={styles.counter}>{location.length}/80</Text>
        <FieldError>{errors.location}</FieldError>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()} disabled={saving} accessibilityRole="button" accessibilityLabel="Cancel profile changes">
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.saveButton, saving && styles.disabled]} onPress={save} disabled={saving} accessibilityRole="button" accessibilityLabel="Save profile" accessibilityState={{ busy: saving }}>
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Save</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7' },
  content: { padding: 22, paddingBottom: 42 },
  avatarButton: { alignItems: 'center', marginVertical: 14 },
  avatarAction: { marginTop: 9, color: '#2F7D32', fontSize: 15, fontWeight: '800' },
  label: { marginTop: 18, marginBottom: 7, color: '#333A3F', fontSize: 14, fontWeight: '800' },
  optional: { color: '#788187', fontWeight: '500' },
  input: { minHeight: 52, paddingHorizontal: 14, borderWidth: 1, borderColor: '#CBD1D5', borderRadius: 12, backgroundColor: '#FFFFFF', fontSize: 16 },
  multiline: { minHeight: 112, paddingTop: 13 },
  usernameRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#CBD1D5', borderRadius: 12, backgroundColor: '#FFFFFF' },
  at: { marginLeft: 14, color: '#687178', fontSize: 17 },
  usernameInput: { flex: 1, minHeight: 50, paddingHorizontal: 5, fontSize: 16 },
  inputError: { borderColor: '#B42318' },
  counter: { marginTop: 5, color: '#7A8288', fontSize: 12, textAlign: 'right' },
  helper: { marginTop: 7, color: '#737C83', fontSize: 13, lineHeight: 18 },
  error: { marginTop: 5, color: '#B42318', fontSize: 13, lineHeight: 18 },
  actions: { marginTop: 30, flexDirection: 'row', gap: 12 },
  cancelButton: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#BFC6CA', borderRadius: 13, backgroundColor: '#FFFFFF' },
  cancelText: { color: '#444C52', fontSize: 16, fontWeight: '800' },
  saveButton: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#2F7D32' },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  disabled: { opacity: 0.6 },
});
