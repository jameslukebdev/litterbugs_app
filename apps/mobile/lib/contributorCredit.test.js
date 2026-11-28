import { beforeEach, describe, expect, it, vi } from 'vitest';
const rpc = vi.hoisted(() => vi.fn());
vi.mock('./supabase', () => ({ supabase: { rpc } }));
import { contributorNameShown, donationTimeAgo, loadContributorCredit, savedContributorVisibility, setContributorVisibility } from './contributorCredit';

describe('public donor credit and owner privacy', () => {
  beforeEach(() => rpc.mockReset());
  it('uses the sanitized report API and never returns another report’s credit', async () => {
    const credit = { report_id: 'one', donations: [{ name: null, amountCents: 2500, donatedAt: '2026-11-19T17:00:00Z' }] };
    rpc.mockResolvedValue({ data: [{ report_id: 'other', names: ['Wrong report'] }, credit] });
    expect(await loadContributorCredit('one')).toBe(credit);
    expect(rpc).toHaveBeenCalledWith('cleanup_contributor_credits', { report_ids: ['one'] });
    expect(await loadContributorCredit('missing')).toBeNull();
  });
  it('does not make a request without a report, and surfaces reader failures', async () => {
    expect(await loadContributorCredit(null)).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
    rpc.mockResolvedValue({ error: { message: 'offline' } });
    await expect(loadContributorCredit('one')).rejects.toMatchObject({ message: 'offline' });
  });
  it('changes a donation’s visibility only when the server confirms owner authorization', async () => {
    rpc.mockResolvedValue({ data: true });
    expect(await setContributorVisibility('donation', false)).toBe(false);
    expect(rpc).toHaveBeenCalledWith('set_cleanup_contributor_visibility', { contribution_id: 'donation', show_name: false });
    rpc.mockResolvedValue({ data: false });
    await expect(setContributorVisibility('not-owned', true)).rejects.toThrow('could not be saved');
    rpc.mockResolvedValue({ error: { message: 'offline' } });
    await expect(setContributorVisibility('donation', false)).rejects.toThrow('could not be saved');
  });
  it('preserves old public donations and explicit anonymity', () => {
    expect(contributorNameShown(null)).toBe(true);
    expect(contributorNameShown(undefined)).toBe(true);
    expect(contributorNameShown(true)).toBe(true);
    expect(contributorNameShown(false)).toBe(false);
  });
  it('recovers the actual reserved choice after a response was lost or a donor changed it', () => {
    const attempt = { showContributorName: true, intent: { showContributorName: true } };
    expect(savedContributorVisibility(attempt, { show_contributor_name: false })).toBe(false);
    expect(savedContributorVisibility({ showContributorName: false }, { show_contributor_name: null })).toBe(true);
    expect(savedContributorVisibility({ showContributorName: false })).toBe(false);
    expect(savedContributorVisibility({ showContributorName: true, intent: { showContributorName: false } })).toBe(false);
    expect(savedContributorVisibility({ intent: {} })).toBe(true);
  });
  it('formats donation dates without inventing a date for invalid evidence', () => {
    const now = Date.parse('2026-11-20T12:00:00Z');
    expect(donationTimeAgo('2026-11-19T12:00:00Z', now)).toBe('1 day ago');
    expect(donationTimeAgo('2026-11-20T11:59:30Z', now)).toBe('Just now');
    expect(donationTimeAgo('2026-11-20T12:05:00Z', now)).toBe('Just now');
    expect(donationTimeAgo('invalid', now)).toBe('');
  });
  it('works in the published Hermes runtime without RelativeTimeFormat', () => {
    const descriptor = Object.getOwnPropertyDescriptor(Intl, 'RelativeTimeFormat');
    Object.defineProperty(Intl, 'RelativeTimeFormat', { value: undefined, configurable: true });
    try {
      expect(donationTimeAgo('2026-11-20T10:00:00Z', Date.parse('2026-11-20T12:00:00Z'))).toBe('2 hours ago');
    } finally { Object.defineProperty(Intl, 'RelativeTimeFormat', descriptor); }
  });
});
