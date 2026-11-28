import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ exec: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('node:util', () => ({ promisify: () => mocks.exec }));
import { localGoogleReports } from './local-google';

beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('ADMIN_ANALYTICS_GOOGLE_LOCAL_CLI', 'true'); });
afterEach(() => vi.unstubAllEnvs());
describe('existing local Google read connection', () => {
  it.each(['production', 'test'])('never starts local commands in %s', async env => {
    vi.stubEnv('NODE_ENV', env);
    await expect(localGoogleReports('ga', [{}, {}, {}])).rejects.toThrow('disabled');
    expect(mocks.exec).not.toHaveBeenCalled();
  });
  it('uses fixed property/site commands without a shell or OAuth credential export', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    mocks.exec.mockResolvedValue({ stdout: JSON.stringify([{}, {}, {}]) });
    const body = [{ dimensions: [], startDate: '2026-11-06' }, {}, {}];
    await localGoogleReports('gsc', body);
    const [program, args, options] = mocks.exec.mock.calls[0];
    expect(program).toBe(process.execPath);
    expect(args[0]).toMatch(/scripts\/owner-analytics-google-live\.mjs$/);
    expect(args).toContain('gsc');
    expect(args).toContain(JSON.stringify(body));
    expect(options).toMatchObject({ timeout: 30_000, maxBuffer: 2_000_000 });
    expect(options).not.toHaveProperty('shell');
    expect(options).not.toHaveProperty('env');
  });
});
