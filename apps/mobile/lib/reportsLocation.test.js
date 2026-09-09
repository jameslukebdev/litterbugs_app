import { describe, expect, it, vi } from 'vitest';
import { createReportsLocationLoader, reportsLocationPresentation } from './reportsLocation';

const position = { coords: { latitude: 35, longitude: -80 } };
const api = (permission = { status: 'granted', canAskAgain: true }) => ({
  getForegroundPermissionsAsync: vi.fn().mockResolvedValue(permission),
  requestForegroundPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
  hasServicesEnabledAsync: vi.fn().mockResolvedValue(true),
});

describe('Reports location recovery', () => {
  it('asks for permission only after the user chooses Enable location', async () => {
    const location = api({ status: 'undetermined', canAskAgain: true });
    const publish = vi.fn();
    const locate = vi.fn(async ({ onPosition }) => onPosition(position, { cached: false }));
    const loader = createReportsLocationLoader(location, publish, locate);
    await loader.refresh();
    expect(publish).toHaveBeenLastCalledWith({ status: 'permission-needed', origin: null });
    expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    await loader.refresh({ requestPermission: true });
    expect(location.requestForegroundPermissionsAsync).toHaveBeenCalledOnce();
    expect(publish).toHaveBeenLastCalledWith({ status: 'ready', origin: position.coords });
  });

  it('distinguishes denied permission, disabled services, and failed GPS', async () => {
    const publish = vi.fn();
    const locate = vi.fn().mockRejectedValue(new Error('timed out'));
    const location = api({ status: 'denied', canAskAgain: false });
    const loader = createReportsLocationLoader(location, publish, locate);
    await loader.refresh();
    expect(publish).toHaveBeenLastCalledWith({ status: 'denied', origin: null });
    expect(reportsLocationPresentation('denied').action).toBe('Open settings');
    location.getForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    location.hasServicesEnabledAsync.mockResolvedValue(false);
    await loader.refresh();
    expect(publish).toHaveBeenLastCalledWith({ status: 'services-disabled', origin: null });
    expect(locate).not.toHaveBeenCalled();
    location.hasServicesEnabledAsync.mockResolvedValue(true);
    await loader.refresh();
    expect(publish).toHaveBeenLastCalledWith({ status: 'unavailable', origin: null });
    expect(reportsLocationPresentation('unavailable').action).toBe('Retry location');
  });

  it('removes old distances immediately and ignores an earlier request after a retry', async () => {
    const publish = vi.fn();
    const callbacks = [];
    const locate = vi.fn(({ onPosition }) => { callbacks.push(onPosition); return Promise.resolve(); });
    const location = api();
    const loader = createReportsLocationLoader(location, publish, locate);
    await loader.refresh();
    callbacks[0](position, { cached: true });
    expect(publish).toHaveBeenLastCalledWith({ status: 'cached', origin: position.coords });
    location.getForegroundPermissionsAsync.mockResolvedValue({ status: 'denied', canAskAgain: false });
    await loader.refresh();
    callbacks[0](position, { cached: false });
    expect(publish).toHaveBeenLastCalledWith({ status: 'denied', origin: null });
  });

  it('ignores a GPS callback after leaving the screen', async () => {
    const publish = vi.fn();
    let deliver;
    const loader = createReportsLocationLoader(api(), publish, ({ onPosition }) => { deliver = onPosition; });
    await loader.refresh();
    loader.cancel();
    publish.mockClear();
    deliver(position, { cached: false });
    expect(publish).not.toHaveBeenCalled();
  });

  it('ignores a late permission response after focus changes', async () => {
    let resolve;
    const location = api();
    location.getForegroundPermissionsAsync.mockImplementation(() => new Promise(done => { resolve = done; }));
    const locate = vi.fn();
    const publish = vi.fn();
    const loader = createReportsLocationLoader(location, publish, locate);
    const pending = loader.refresh({ requestPermission: true });
    loader.cancel();
    publish.mockClear();
    resolve({ status: 'undetermined', canAskAgain: true });
    await pending;
    expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
    expect(locate).not.toHaveBeenCalled();
  });
});
