import * as FileSystem from 'expo-file-system/legacy';
import { preparePhotoForSafetyScan } from './photoSafetyPreparation';
import { uploadSecureMedia } from './secureMediaUpload';

// Preserve completed uploads for safe retry. Never remove earlier report evidence.
export async function uploadIssueMedia({ assets, paths, userId, subjectId, kind = 'issue' }) {
  for (let index = 0; index < assets.length; index += 1) {
    if (paths[index]) continue;
    const photo = await preparePhotoForSafetyScan(assets[index].uri, { width: assets[index].width, height: assets[index].height });
    const base64 = await FileSystem.readAsStringAsync(photo.uri, { encoding: 'base64' });
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    paths[index] = await uploadSecureMedia({ userId, kind, subjectId, bytes, mimeType: photo.mimeType || 'image/jpeg' });
  }
  return [...paths];
}
