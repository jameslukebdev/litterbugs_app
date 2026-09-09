import { beforeEach, describe, expect, it, vi } from 'vitest';
const { getItem, setItem, removeItem, alert } = vi.hoisted(() => ({ getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn(), alert: vi.fn() }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: { getItem, setItem, removeItem } }));
vi.mock('react-native', () => ({ Alert: { alert } }));
import { requirePhotoReviewConsent, reviewPhotoPermission } from './photoReviewConsent';

describe('explicit photo review permission', () => {
  beforeEach(() => { vi.resetAllMocks(); getItem.mockResolvedValue(null); setItem.mockResolvedValue(); removeItem.mockResolvedValue(); });
  it('shares one prompt across simultaneous photos and persists only an affirmative answer', async () => {
    const a = requirePhotoReviewConsent('a'), b = requirePhotoReviewConsent('a');
    await vi.waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
    expect(setItem).not.toHaveBeenCalled();
    alert.mock.calls[0][2][1].onPress(); await Promise.all([a, b]);
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(setItem).toHaveBeenCalledWith(expect.stringContaining(':a'), 'allowed');
  });
  it('rejects cancellation without saving permission', async () => {
    alert.mockImplementation((_title, _copy, buttons) => buttons[0].onPress());
    await expect(requirePhotoReviewConsent('b')).rejects.toMatchObject({ code: 'PHOTO_REVIEW_CANCELLED' });
    expect(setItem).not.toHaveBeenCalled();
  });
  it('reuses only the current account’s current-version grant', async () => {
    getItem.mockImplementation(async k => k.endsWith(':a') ? 'allowed' : null);
    await requirePhotoReviewConsent('a'); expect(alert).not.toHaveBeenCalled();
    alert.mockImplementation((_title, _copy, buttons) => buttons[0].onPress());
    await expect(requirePhotoReviewConsent('b')).rejects.toThrow();
    expect(alert).toHaveBeenCalledTimes(1);
  });
  it('fails closed if the stored permission cannot be read', async () => {
    getItem.mockRejectedValue(new Error('storage failed'));
    await expect(requirePhotoReviewConsent('c')).rejects.toThrow('storage failed');
    expect(alert).not.toHaveBeenCalled(); expect(setItem).not.toHaveBeenCalled();
  });
  it('withdraws permission for the selected account', async () => {
    reviewPhotoPermission('a'); await alert.mock.calls[0][2][1].onPress();
    expect(removeItem).toHaveBeenCalledWith(expect.stringContaining(':a'));
  });
});
