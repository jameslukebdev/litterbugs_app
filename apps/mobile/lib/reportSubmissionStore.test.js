import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  storage: new Map(), drafts: new Map(), record: null,
  permission: vi.fn(), position: vi.fn(), rpc: vi.fn(), from: vi.fn(),
}));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: {
  getItem: async key => mocks.storage.get(key) ?? null,
  setItem: async (key, value) => mocks.storage.set(key, value),
  removeItem: async key => mocks.storage.delete(key),
} }));
vi.mock('expo-crypto', () => ({ randomUUID: () => 'report-1' }));
vi.mock('expo-location', () => ({
  Accuracy: { High: 4 },
  getForegroundPermissionsAsync: mocks.permission,
  requestForegroundPermissionsAsync: mocks.permission,
  getCurrentPositionAsync: mocks.position,
}));
vi.mock('./savedReportDraft', () => ({
  saveReportDraft: async (user, draft) => mocks.drafts.set(user, draft),
  loadReportDraft: async user => mocks.drafts.get(user),
}));
vi.mock('./supabase', () => ({ supabase: { from: mocks.from, rpc: mocks.rpc } }));
import { publishReportDraft } from './reportSubmissionStore';

const coordinate = { latitude: 36, longitude: -81 };
const fix = (coords = coordinate) => ({ coords, timestamp: Date.now() });
let options;
beforeEach(() => {
  vi.resetAllMocks();
  mocks.storage.clear();
  mocks.drafts.clear();
  mocks.record = null;
  mocks.permission.mockResolvedValue({ granted: true });
  mocks.position.mockImplementation(async () => fix());
  mocks.from.mockImplementation(() => {
    const query = {
      select: () => query, eq: () => query,
      maybeSingle: async () => ({ data: mocks.record }),
      single: async () => ({ data: mocks.record }),
      upsert: async row => { mocks.record ||= row; return {}; },
      update: fields => { Object.assign(mocks.record, fields); return query; },
      then: resolve => Promise.resolve({}).then(resolve),
    };
    return query;
  });
  mocks.rpc.mockImplementation(async (_, args) => {
    mocks.record = { ...mocks.record, is_published: true, photo_paths: args.target_photo_paths };
    return { data: mocks.record };
  });
  options = {
    userId: 'user-1', coordinate,
    payload: { title: 'Roadside bottles', ...coordinate },
    form: { photos: ['file://photo.jpg'] },
    upload: vi.fn().mockResolvedValue(['user-1/report-1/photo.jpg']),
  };
});

describe('mobile publication with GPS and durable retries', () => {
  it('stops before creating or uploading a report when GPS permission is denied', async () => {
    mocks.permission.mockResolvedValue({ granted: false });
    await expect(publishReportDraft(options)).rejects.toThrow('Allow location access');
    expect(mocks.from).not.toHaveBeenCalled();
    expect(options.upload).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('uses a second fresh fix after uploads and sends it to the publication RPC', async () => {
    const finalFix = fix({ latitude: 36.1, longitude: -81 });
    mocks.position.mockResolvedValueOnce(fix()).mockResolvedValueOnce(finalFix);
    await expect(publishReportDraft(options)).resolves.toMatchObject({ is_published: true });
    expect(mocks.position).toHaveBeenCalledTimes(2);
    expect(mocks.rpc).toHaveBeenCalledWith('publish_report', {
      target_report_id: 'report-1', target_photo_paths: ['user-1/report-1/photo.jpg'],
      current_latitude: 36.1, current_longitude: -81,
      location_captured_at: new Date(finalFix.timestamp).toISOString(),
    });
    expect(mocks.record).not.toHaveProperty('current_latitude');
  });

  it('keeps uploaded photos private when the final GPS check fails, then resumes without reupload', async () => {
    mocks.position.mockResolvedValueOnce(fix()).mockResolvedValueOnce(fix({ latitude: 40, longitude: -81 }));
    await expect(publishReportDraft(options)).rejects.toThrow('within 50 miles');
    expect(mocks.record.is_published).toBe(false);
    expect(mocks.rpc).not.toHaveBeenCalled();
    await expect(publishReportDraft(options)).resolves.toMatchObject({ is_published: true });
    expect(options.upload).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });

  it('recovers a successful publication after losing its response without requiring another GPS fix', async () => {
    mocks.rpc.mockImplementationOnce(async () => {
      mocks.record.is_published = true;
      throw new Error('Response lost');
    });
    await expect(publishReportDraft(options)).rejects.toThrow('Response lost');
    mocks.permission.mockResolvedValue({ granted: false });
    await expect(publishReportDraft(options)).resolves.toMatchObject({ id: 'report-1', is_published: true });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.position).toHaveBeenCalledTimes(2);
    expect(options.upload).toHaveBeenCalledTimes(1);
  });
});
