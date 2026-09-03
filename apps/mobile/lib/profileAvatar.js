import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';
import { uploadSecureMedia } from './secureMediaUpload';
import { preparePhotoForSafetyScan } from './photoSafetyPreparation';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const base64ToUint8Array = (base64) => {
  const binary = globalThis.atob
    ? globalThis.atob(base64)
    : Buffer.from(base64, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const pickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
  selectionLimit: 1,
};

const choosePhoto = async (source) => {
  const permission = source === 'camera'
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (permission.status !== 'granted') {
    Alert.alert(
      'Permission required',
      source === 'camera'
        ? 'Allow camera access to take a profile photo.'
        : 'Allow photo access to choose a profile photo.'
    );
    return null;
  }

  const result = source === 'camera'
    ? await ImagePicker.launchCameraAsync(pickerOptions)
    : await ImagePicker.launchImageLibraryAsync(pickerOptions);

  return result.canceled ? null : result.assets?.[0] ?? null;
};

export const showAvatarSourceMenu = ({ onAsset, onRemove, canRemove }) => {
  const select = async (source) => {
    try {
      const asset = await choosePhoto(source);
      if (asset) onAsset(asset);
    } catch (error) {
      console.log('Profile photo picker error:', error);
      Alert.alert('Couldn’t open photos', 'Try again or check the app’s permissions in Settings.');
    }
  };

  const actions = [
    {
      text: 'Take Photo',
      onPress: () => select('camera'),
    },
    {
      text: 'Choose from Library',
      onPress: () => select('library'),
    },
  ];

  if (canRemove) {
    actions.push({ text: 'Remove Photo', style: 'destructive', onPress: onRemove });
  }
  actions.push({ text: 'Cancel', style: 'cancel' });

  const visibleActions = Platform.OS === 'android' && canRemove
    ? actions.filter(({ style }) => style !== 'cancel')
    : actions;
  Alert.alert('Profile photo', 'Choose a photo source.', visibleActions, { cancelable: true });
};

export const uploadProfileAvatar = async (userId, asset) => {
  if (!userId || !asset?.uri) throw new Error('No profile photo was selected.');

  const preparedPhoto = await preparePhotoForSafetyScan(asset.uri);
  const info = await FileSystem.getInfoAsync(preparedPhoto.uri, { size: true });
  const size = preparedPhoto.byteSize ?? info.size ?? 0;
  if (size > MAX_AVATAR_BYTES) {
    throw new Error('Choose an image smaller than 5 MB.');
  }

  const base64 = await FileSystem.readAsStringAsync(preparedPhoto.uri, {
    encoding: 'base64',
  });
  const bytes = base64ToUint8Array(base64);
  const detectedContentType = preparedPhoto.mimeType || asset.mimeType
    || (Platform.OS === 'ios' && /\.hei[cf]$/i.test(preparedPhoto.uri)
      ? 'image/heic'
      : 'image/jpeg');
  const contentType = detectedContentType === 'image/jpg'
    ? 'image/jpeg'
    : detectedContentType.toLowerCase();
  if (!ALLOWED_AVATAR_MIME_TYPES.has(contentType)) {
    throw new Error('Choose a JPEG, PNG, WebP, HEIC, or HEIF image.');
  }
  return uploadSecureMedia({
    userId,
    kind: 'avatar',
    bytes,
    mimeType: contentType,
  });
};

export const removeProfileAvatar = async (userId) => {
  const path = `${userId}/avatar`;
  const { error } = await supabase.storage.from('profile_avatars').remove([path]);
  if (error) throw error;
};
