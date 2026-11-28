import { useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProfileAvatar from '../ProfileAvatar';
import { showAvatarSourceMenu } from '../lib/profileAvatar';
import { colors, fonts } from '../lib/theme';
export default function ProfilePhotoEditor({ profile, initialAsset, initialRemoved, onCancel, onDone }) {
  const [asset, setAsset] = useState(initialAsset), [removed, setRemoved] = useState(initialRemoved);
  const insets = useSafeAreaInsets();
  const hasPhoto = Boolean(asset || (!removed && (profile?.avatar_path || profile?.provider_avatar_url)));
  return <Modal animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 24, paddingBottom: insets.bottom + 24, backgroundColor: colors.white }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity accessibilityRole="button" onPress={onCancel} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.body, fontSize: 16 }}>Cancel</Text></TouchableOpacity>
        <Text style={{ fontSize: 18, fontFamily: fonts.heading, color: colors.ink }}>Profile photo</Text>
        <TouchableOpacity accessibilityRole="button" onPress={() => onDone(asset, removed)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.primary, fontSize: 16, fontWeight: '700' }}>Done</Text></TouchableOpacity>
      </View>
      <View style={{ alignItems: 'center', marginTop: 36 }}><ProfileAvatar profile={removed ? { ...profile, avatar_path: null, provider_avatar_url: null } : profile} previewUri={asset?.uri} size={220} /></View>
      <Text style={{ textAlign: 'center', marginTop: 24, color: colors.muted, fontSize: 15, lineHeight: 22 }}>Your photo is public on your profile and reports.</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={hasPhoto ? 'Change photo source' : 'Add profile photo'} onPress={() => showAvatarSourceMenu({ onAsset: next => { setAsset(next); setRemoved(false); }, canRemove: hasPhoto, onRemove: () => { setAsset(null); setRemoved(true); } })} style={{ minHeight: 52, backgroundColor: colors.primary, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 28 }}><Text style={{ color: colors.white, fontSize: 16, fontWeight: '700' }}>{hasPhoto ? 'Change photo' : 'Add photo'}</Text></TouchableOpacity>
      <Text style={{ textAlign: 'center', color: colors.muted, marginTop: 16, lineHeight: 20 }}>Choose a photo and adjust the crop. Changes apply when you save your profile.</Text>
    </ScrollView>
  </Modal>;
}
