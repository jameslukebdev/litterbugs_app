import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ sheet: vi.fn(), alert: vi.fn(), library: vi.fn(), permission: vi.fn() }));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' }, ActionSheetIOS: { showActionSheetWithOptions: m.sheet }, Alert: { alert: m.alert }, Linking: { openSettings: vi.fn() } }));
vi.mock('expo-file-system/legacy', () => ({}));
vi.mock('expo-image-picker', () => ({ requestMediaLibraryPermissionsAsync: m.permission, launchImageLibraryAsync: m.library }));
vi.mock('./supabase', () => ({ supabase: {} }));
vi.mock('./secureMediaUpload', () => ({ uploadSecureMedia: vi.fn() }));
vi.mock('./photoSafetyPreparation', () => ({ preparePhotoForSafetyScan: vi.fn() }));
import { showAvatarSourceMenu } from './profileAvatar';
beforeEach(() => { vi.clearAllMocks(); m.permission.mockResolvedValue({ status: 'granted' }); });
it('offers cropping and preserves the photo when the picker is canceled', async () => {
  m.library.mockResolvedValue({ canceled: true });
  const onAsset = vi.fn();
  showAvatarSourceMenu({ onAsset, canRemove: false });
  m.sheet.mock.calls[0][1](1);
  await vi.waitFor(() => expect(m.library).toHaveBeenCalledWith(expect.objectContaining({ allowsEditing: true, aspect: [1, 1], selectionLimit: 1 })));
  expect(onAsset).not.toHaveBeenCalled();
});
it('stages removal only when the destructive source option is chosen', () => {
  const onRemove = vi.fn();
  showAvatarSourceMenu({ onAsset: vi.fn(), canRemove: true, onRemove });
  const [options, select] = m.sheet.mock.calls[0];
  select(options.cancelButtonIndex); expect(onRemove).not.toHaveBeenCalled();
  select(options.destructiveButtonIndex); expect(onRemove).toHaveBeenCalledOnce();
});
