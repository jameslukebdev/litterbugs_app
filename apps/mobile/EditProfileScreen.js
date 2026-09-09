import { useHeaderHeight } from '@react-navigation/elements';
import { usePreventRemove } from '@react-navigation/native';
import ProfilePhotoEditor from './components/ProfilePhotoEditor';
import { useEffect, useLayoutEffect, useState } from 'react';
import {
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

import { userMessage } from './lib/userMessage';
import ProfileAvatar from './ProfileAvatar';
import { Ionicons } from '@expo/vector-icons';
import { useProfile } from './lib/profile';
import {
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
  const headerHeight = useHeaderHeight();
  const { profile, updateProfile } = useProfile();
  const { refreshReports } = useReports();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [location, setLocation] = useState(profile?.location || '');
  const [photoEditorOpen, setPhotoEditorOpen] = useState(false);
  const [avatarAsset, setAvatarAsset] = useState(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [discardAction, setDiscardAction] = useState(null);
  const dirty = displayName !== (profile?.display_name || '') || username !== (profile?.username || '') || bio !== (profile?.bio || '') || location !== (profile?.location || '') || Boolean(avatarAsset) || removeAvatar;
  usePreventRemove((dirty || saving) && !saved && !discardAction, ({ data }) => {
    if (saving) return;
    Alert.alert('Discard profile changes?', 'Your changes have not been saved.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard changes', style: 'destructive', onPress: () => setDiscardAction(data.action) },
    ]);
  });
  useEffect(() => {
    if (discardAction) navigation.dispatch(discardAction);
    else if (saved) navigation.goBack();
  }, [discardAction, saved, navigation]);

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

      if (avatarAsset) avatarPath = await uploadProfileAvatar(user.id, avatarAsset);

      await updateProfile({ ...validation.values, avatar_path: avatarPath, ...(removeAvatar ? { provider_avatar_url: null } : {}) });
      await refreshReports().catch(() => {});
      setSaved(true);
    } catch (saveError) {
      console.log('Profile save error:', saveError);
      if (saveError.code === '23505' || /username.*unique/i.test(saveError.message || '')) {
        setErrors({ username: 'That username is taken.' });
      } else {
        Alert.alert('Couldn’t save profile', userMessage(saveError, 'Your changes haven’t been saved. Please try again.'));
      }
    } finally {
      setSaving(false);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({ gestureEnabled: !dirty && !saving, headerLeft: () => <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back" disabled={saving} onPress={() => navigation.goBack()} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}><Ionicons name="chevron-back" size={26} color="#2F7D32" /></TouchableOpacity>, headerRight: () => <TouchableOpacity accessibilityRole="button" accessibilityLabel="Save profile" accessibilityState={{ disabled: saving || !dirty, busy: saving }} disabled={saving || !dirty} onPress={save} style={{ minHeight: 44, minWidth: 48, justifyContent: 'center', alignItems: 'flex-end' }}><Text style={{ color: saving || !dirty ? '#929B95' : '#2F7D32', fontSize: 16, fontWeight: '700' }}>{saving ? 'Saving…' : 'Save'}</Text></TouchableOpacity> });
  }, [navigation, saving, dirty, displayName, username, bio, location, avatarAsset, removeAvatar]);

  const setField = (setter, key) => (value) => {
    setter(value);
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  return (
    <KeyboardAvoidingView style={styles.container} keyboardVerticalOffset={headerHeight} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {photoEditorOpen ? <ProfilePhotoEditor profile={{ ...profile, display_name: displayName }} initialAsset={avatarAsset} initialRemoved={removeAvatar} onCancel={() => setPhotoEditorOpen(false)} onDone={(asset, removed) => { setAvatarAsset(asset); setRemoveAvatar(removed); setPhotoEditorOpen(false); }} /> : null}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity
          style={styles.avatarButton}
          onPress={() => setPhotoEditorOpen(true)}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Change profile photo"
        >
          <ProfileAvatar
            profile={removeAvatar ? { ...profile, avatar_path: null, provider_avatar_url: null } : { ...profile, display_name: displayName }}
            previewUri={avatarAsset?.uri}
            size={104}
          />
          <Text style={styles.avatarAction}>{avatarAsset || (!removeAvatar && (profile?.avatar_path || profile?.provider_avatar_url)) ? 'Change photo' : 'Add photo'}</Text>
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
});
