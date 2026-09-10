import { describe, expect, it, vi } from 'vitest';
import { historyClient, historyId } from '../test-support/historyClient';
const mocks = vi.hoisted(() => ({ client: null }));
vi.mock('./supabase', () => ({ supabase: { from: (...args) => mocks.client.from(...args) } }));
import { loadPublicMember, loadPublicMemberReports } from './publicMember';
it('loads author activity independently of discovery, separates completed and excludes closed/sample reports', async () => {
  const rows = Array.from({ length: 65 }, (_, i) => ({ id: historyId(i), user_id: 'author', is_sample: false, is_published: true, cleanup_state: 'available', created_at: '2026-09-08T12:00:00Z', expires_at: '2099-01-01T00:00:00Z' }));
  rows[0].cleanup_state = 'completed'; rows[1].expired_at = '2026-01-01'; rows[2].cancelled_at = '2026-01-01'; rows[3].is_sample = true; rows[4].user_id = 'other';
  const fixture = historyClient({ reports: rows }); mocks.client = fixture.client;
  const ids = []; let cursor;
  do { const page = await loadPublicMemberReports({ profileId: 'author', cursor }); ids.push(...page.items.map(row => row.id)); cursor = page.nextCursor; } while (cursor);
  expect(ids).toHaveLength(60); expect(new Set(ids).size).toBe(60);
  expect((await loadPublicMemberReports({ profileId: 'author', view: 'completed' })).items.map(row => row.id)).toEqual([historyId(0)]);
  for (const url of fixture.requests) {
    expect(url.searchParams.get('user_id')).toBe('eq.author');
    expect(url.searchParams.get('select').split(',')).toContain('photo_paths');
    expect([...url.searchParams.keys()].some(key => ['latitude', 'longitude'].includes(key))).toBe(false);
  }
});
it('keeps failed and missing public profiles distinct', async () => {
  const fixture = historyClient({ profiles: [] }); mocks.client = fixture.client;
  expect(await loadPublicMember('missing')).toBeNull();
  fixture.fail();
  await expect(loadPublicMember('author')).rejects.toMatchObject({ message: 'offline' });
});
