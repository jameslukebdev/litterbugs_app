import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
let directory: string;
const window = { start: '2026-11-10', end: '2026-11-13', timezone: 'UTC' };
const data = { sessions: 29, rageSessions: null, deadSessions: null, quickBackSessions: null, scriptErrorSessions: null, rageRate: 0, deadRate: 0.069, quickBackRate: 0.1724, scriptErrorRate: 0 };
beforeEach(async () => {
  vi.resetModules();
  directory = await mkdtemp(join(tmpdir(), 'litterbugs-clarity-test-'));
  vi.spyOn(process, 'cwd').mockReturnValue(directory);
  vi.stubEnv('NODE_ENV', 'development');
});
afterEach(async () => { vi.restoreAllMocks(); vi.unstubAllEnvs(); await rm(directory, { recursive: true, force: true }); });
describe('Clarity local request budget', () => {
  it('shares one read across period switches and server restarts, retaining actual observation dates', async () => {
    const load = vi.fn().mockResolvedValue({ ...data, privateRawUrl: 'not-to-be-stored' });
    const first = await (await import('./local-clarity-cache')).localClaritySource('fingerprint', window, load, '');
    vi.resetModules();
    const second = await (await import('./local-clarity-cache')).localClaritySource('fingerprint', { ...window, start: '2026-10-16' }, load, '');
    expect(load).toHaveBeenCalledTimes(1);
    expect(second.data?.deadRate).toBe(0.069);
    expect(second.window).toEqual(first.window);
    const saved = await readFile(join(directory, '.analytics-local/clarity-live.json'), 'utf8');
    expect(saved).not.toContain('privateRawUrl');
    expect(saved).not.toContain('not-to-be-stored');
  });
  it('does not retry failures on every reload', async () => {
    const load = vi.fn().mockRejectedValue(new Error('private token in error'));
    const { localClaritySource } = await import('./local-clarity-cache');
    const first = await localClaritySource('fingerprint', window, load, '');
    const second = await localClaritySource('fingerprint', window, load, '');
    expect(first.status).toBe('error'); expect(second.data).toBeNull();
    expect(load).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(second)).not.toContain('private token');
  });
  it('reserves quota before a request, then refreshes after six hours', async () => {
    let now = Date.now(); vi.spyOn(Date, 'now').mockImplementation(() => now);
    const load = vi.fn().mockImplementation(async () => {
      const saved = JSON.parse(await readFile(join(directory, '.analytics-local/clarity-live.json'), 'utf8'));
      expect(saved.attempts).toBeGreaterThan(0); expect(saved.nextAttemptAt).toBeGreaterThan(now);
      return data;
    });
    const { localClaritySource } = await import('./local-clarity-cache');
    await localClaritySource('fingerprint', window, load, '');
    now += 21_600_001;
    await localClaritySource('fingerprint', window, load, '');
    expect(load).toHaveBeenCalledTimes(2);
  });
  it('keeps the daily cap even if the credential changes', async () => {
    const { localClaritySource } = await import('./local-clarity-cache');
    await localClaritySource('first', window, async () => data, '');
    const file = join(directory, '.analytics-local/clarity-live.json');
    const saved = JSON.parse(await readFile(file, 'utf8')); saved.attempts = 8;
    await writeFile(file, JSON.stringify(saved));
    const load = vi.fn().mockResolvedValue(data);
    expect((await localClaritySource('changed', window, load, '')).status).toBe('error');
    expect(load).not.toHaveBeenCalled();
  });
});
