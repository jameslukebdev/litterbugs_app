import { useHeaderHeight } from '@react-navigation/elements';
import { usePreventRemove } from '@react-navigation/native';
import ProfilePhotoEditor from './components/ProfilePhotoEditor';
import { useEffect, useLayoutEffect, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
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
import { colors } from './lib/theme';

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
  const [focusedField, setFocusedField] = useState(null);
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
    if (saving || !dirty) return;
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
    navigation.setOptions({ gestureEnabled: !dirty && !saving, headerLeft: () => <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back" disabled={saving} onPress={() => navigation.goBack()} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}><Ionicons name="chevron-back" size={26} color={colors.primary} /></TouchableOpacity>, headerRight: () => <TouchableOpacity accessibilityRole="button" accessibilityLabel="Save profile" accessibilityState={{ disabled: saving || !dirty, busy: saving }} disabled={saving || !dirty} onPress={save} style={styles.saveButton}><Text style={{ color: !dirty ? colors.subtle : colors.primary, fontSize: 16, fontWeight: '600', opacity: saving ? 0 : 1 }}>Save</Text>{saving ? <ActivityIndicator color={colors.primary} size="small" style={StyleSheet.absoluteFill} /> : null}</TouchableOpacity> });
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
          <View style={styles.avatarFrame}>
          <ProfileAvatar
            profile={removeAvatar ? { ...profile, avatar_path: null, provider_avatar_url: null } : { ...profile, display_name: displayName }}
            previewUri={avatarAsset?.uri}
            size={72}
          />
          <View style={styles.cameraBadge}><Ionicons name="camera-outline" size={15} color={colors.primary} /></View>
          </View>
          <View style={styles.avatarCopy}><Text style={styles.avatarLabel}>Profile photo</Text>
          <Text style={styles.avatarAction}>{avatarAsset || (!removeAvatar && (profile?.avatar_path || profile?.provider_avatar_url)) ? 'Change photo' : 'Add photo'}</Text></View>
          <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
        </TouchableOpacity>

        <View style={styles.fieldHeading}><Text style={styles.label}>Display name</Text><Text style={styles.counter}>{displayName.length}/60</Text></View>
        <TextInput editable={!saving} onFocus={() => setFocusedField('displayName')} onBlur={() => setFocusedField(null)} selectionColor={colors.primary} placeholderTextColor={colors.subtle} value={displayName} onChangeText={setField(setDisplayName, 'displayName')} maxLength={60} autoCapitalize="words" style={[styles.input, focusedField === 'displayName' && styles.inputFocused, errors.displayName && styles.inputError]} accessibilityLabel="Display name" />
        <FieldError>{errors.displayName}</FieldError>

        <View style={styles.fieldHeading}><Text style={styles.label}>Username <Text style={styles.optional}>(optional)</Text></Text><Text style={styles.counter}>{username.length}/30</Text></View>
        <View style={[styles.usernameRow, focusedField === 'username' && styles.inputFocused, errors.username && styles.inputError]}>
          <Text style={styles.at}>@</Text>
          <TextInput editable={!saving} onFocus={() => setFocusedField('username')} onBlur={() => setFocusedField(null)} selectionColor={colors.primary} placeholderTextColor={colors.subtle} value={username} onChangeText={setField(setUsername, 'username')} maxLength={30} autoCapitalize="none" autoCorrect={false} style={styles.usernameInput} placeholder="cleanup.friend" accessibilityLabel="Username" />
        </View>
        <FieldError>{errors.username}</FieldError>

        <View style={styles.fieldHeading}><Text style={styles.label}>Bio <Text style={styles.optional}>(optional)</Text></Text><Text style={styles.counter}>{bio.length}/160</Text></View>
        <TextInput editable={!saving} onFocus={() => setFocusedField('bio')} onBlur={() => setFocusedField(null)} selectionColor={colors.primary} placeholderTextColor={colors.subtle} value={bio} onChangeText={setField(setBio, 'bio')} maxLength={160} multiline textAlignVertical="top" style={[styles.input, styles.multiline, focusedField === 'bio' && styles.inputFocused, errors.bio && styles.inputError]} placeholder="Tell your community a little about yourself." accessibilityLabel="Bio" />
        <FieldError>{errors.bio}</FieldError>

        <View style={styles.fieldHeading}><Text style={styles.label}>Location <Text style={styles.optional}>(optional)</Text></Text><Text style={styles.counter}>{location.length}/80</Text></View>
        <TextInput editable={!saving} onFocus={() => setFocusedField('location')} onBlur={() => setFocusedField(null)} selectionColor={colors.primary} placeholderTextColor={colors.subtle} value={location} onChangeText={setField(setLocation, 'location')} maxLength={80} style={[styles.input, focusedField === 'location' && styles.inputFocused, errors.location && styles.inputError]} placeholder="Asheville, NC" accessibilityLabel="Location" />
        <Text style={styles.helper}>This is public. Use a city or region, not a street address.</Text>
        <FieldError>{errors.location}</FieldError>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 42 },
  avatarButton: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, marginBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  avatarAction: { marginTop: 4, color: colors.primary, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  label: { flex: 1, color: colors.ink, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  optional: { color: colors.muted, fontWeight: '500' },
  input: { minHeight: 52, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.primaryTint, color: colors.ink, fontSize: 16 },
  multiline: { minHeight: 100, paddingTop: 13, paddingBottom: 13 },
  usernameRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.white },
  at: { marginLeft: 14, color: colors.muted, fontSize: 17 },
  usernameInput: { flex: 1, minHeight: 50, paddingHorizontal: 5, fontSize: 16 },
  saveButton: { minWidth: 60, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  avatarFrame: { padding: 3, borderWidth: 1, borderColor: colors.line, borderRadius: 40 },
  cameraBadge: { position: 'absolute', bottom: -1, right: -1, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primarySoft, borderWidth: 2, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  avatarCopy: { flex: 1 },
  avatarLabel: { color: colors.ink, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  fieldHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, marginBottom: 7 },
  inputFocused: { borderColor: colors.primary, backgroundColor: colors.white },
  inputError: { borderColor: '#B42318' },
  counter: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'right' },
  helper: { marginTop: 7, color: colors.muted, fontSize: 13, lineHeight: 18 },
  error: { marginTop: 5, color: '#B42318', fontSize: 13, lineHeight: 18 },
});
