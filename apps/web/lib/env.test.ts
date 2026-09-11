import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSupabaseEnv } from './env';

afterEach(() => vi.unstubAllEnvs());

describe('Supabase project boundary', () => {
  it('allows a loopback backend for isolated development only', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'local-test-key');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:62321');
    vi.stubEnv('NODE_ENV', 'development');
    expect(getSupabaseEnv().url).toBe('http://localhost:62321');
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => getSupabaseEnv()).toThrow('Refusing to connect');
  });
  it('continues rejecting other remote projects in development', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'local-test-key');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://unrelated.supabase.co');
    vi.stubEnv('NODE_ENV', 'development');
    expect(() => getSupabaseEnv()).toThrow('Refusing to connect');
  });
});
