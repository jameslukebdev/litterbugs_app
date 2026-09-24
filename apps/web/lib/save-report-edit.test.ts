import { describe, expect, it, vi } from 'vitest';
import { EMPTY_REPORT_DRAFT, type Report } from '@litterbugs/report-contract';
import { saveReportEdit } from './save-report-edit';

function fixture({ fail = false, cleanupFails = false } = {}) {
  const report = { id: 'report', user_id: 'owner', latitude: 36, longitude: -81, photo_paths: ['owner/report/old.jpg'] } as Report;
  const draft = { ...EMPTY_REPORT_DRAFT, title: 'Updated', selectedTypes: ['Bottles'], severity: 'Low' as const };
  const events: string[] = [];
  let payload: unknown;
  const remove = vi.fn(async () => { events.push('remove'); return { error: cleanupFails ? new Error('offline') : null }; });
  const chain = {
    update: vi.fn(value => { payload = value; events.push('update'); return chain; }),
    eq: vi.fn(() => chain), select: () => chain,
    single: async () => { events.push('response'); return { data: fail ? null : { ...report, ...payload as object }, error: fail ? new Error('lost response') : null }; },
  };
  const supabase = { from: vi.fn(() => chain), storage: { from: vi.fn(() => ({ remove })) } } as unknown as Parameters<typeof saveReportEdit>[0]['supabase'];
  return { report, draft, supabase, chain, remove, events };
}

describe('report photo replacement', () => {
  it('keeps the existing photos on text-only edits', async () => {
    const f = fixture();
    const result = await saveReportEdit({ ...f, userId: 'owner', replacementPaths: [] });
    expect(result.photo_paths).toEqual(f.report.photo_paths);
    expect(f.remove).not.toHaveBeenCalled();
    expect(f.chain.update.mock.calls[0][0]).not.toHaveProperty('photo_paths');
    expect(f.chain.eq).toHaveBeenCalledWith('id', 'report');
    expect(f.chain.eq).toHaveBeenCalledWith('user_id', 'owner');
  });

  it('replaces the whole set and removes old photos only after a confirmed save', async () => {
    const f = fixture();
    const result = await saveReportEdit({ ...f, userId: 'owner', replacementPaths: ['owner/report/new.jpg'] });
    expect(result.photo_paths).toEqual(['owner/report/new.jpg']);
    expect(f.remove).toHaveBeenCalledWith(['owner/report/old.jpg']);
    expect(f.events).toEqual(['update', 'response', 'remove']);
  });

  it('never deletes either photo set after an uncertain save response', async () => {
    const f = fixture({ fail: true });
    await expect(saveReportEdit({ ...f, userId: 'owner', replacementPaths: ['owner/report/new.jpg'] })).rejects.toThrow('could not confirm');
    expect(f.remove).not.toHaveBeenCalled();
  });

  it('does not turn successful replacement into a save failure when cleanup fails', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const f = fixture({ cleanupFails: true });
      await expect(saveReportEdit({ ...f, userId: 'owner', replacementPaths: ['owner/report/new.jpg'] })).resolves.toMatchObject({ photo_paths: ['owner/report/new.jpg'] });
    } finally { warning.mockRestore(); }
  });

  it('rejects a fourth replacement photo before updating the report', async () => {
    const f = fixture();
    await expect(saveReportEdit({ ...f, userId: 'owner', replacementPaths: ['a', 'b', 'c', 'd'] })).rejects.toThrow('one to three');
    expect(f.chain.update).not.toHaveBeenCalled();
  });
});
