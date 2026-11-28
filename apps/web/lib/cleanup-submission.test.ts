// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CleanupSubmissionUncertainError, submitCleanupEvidence } from './cleanup-submission';

const failure = vi.hoisted(() => vi.fn());
vi.mock('./website-analytics', () => ({ trackParticipationFailure: failure }));

const { lookup, rpc, remove, upload, invoke } = vi.hoisted(() => ({
  lookup: vi.fn(), rpc: vi.fn(), remove: vi.fn(), upload: vi.fn(), invoke: vi.fn(),
}));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({
  from: () => {
    const chain = { select: () => chain, eq: () => chain, maybeSingle: lookup };
    return chain;
  },
  rpc, storage: { from: () => ({ remove }) }, functions: { invoke },
}) }));
vi.mock('@/lib/secure-media-upload', () => ({ uploadSecureBrowserMedia: upload }));

const input = {
  cleanupId: 'cleanup', userId: 'cleaner', submissionId: 'stable-id',
  photos: [new File(['a'], 'a.jpg'), new File(['b'], 'b.jpg'), new File(['c'], 'c.jpg')],
  description: 'Collected bottles', isPaid: false,
};
beforeEach(() => {
  lookup.mockResolvedValue({ data: null, error: null });
  rpc.mockResolvedValue({ data: { id: 'stable-id' }, error: null });
  upload.mockImplementation(async ({ position }) => `photo-${position}`);
  remove.mockResolvedValue({ error: null });
  invoke.mockResolvedValue({ data: {} });
});
afterEach(() => { vi.resetAllMocks(); vi.useRealTimers(); });

describe('cleanup commit recovery', () => {
  it('saves duration and weight together without dropping either', async () => {
    await submitCleanupEvidence({ ...input, bagsOrItems: 2, weightPounds: 12.5, durationMinutes: 90 });
    expect(rpc).toHaveBeenCalledExactlyOnceWith('submit_cleanup_with_details', expect.objectContaining({
      cleanup_duration_minutes: 90, cleanup_weight_pounds: 12.5, cleanup_bags_or_items_removed: 2,
    }));
  });
  it('preserves the existing submission path when time is omitted', async () => {
    await submitCleanupEvidence(input);
    expect(rpc).toHaveBeenCalledExactlyOnceWith('submit_cleanup_with_weight', expect.not.objectContaining({ cleanup_duration_minutes: expect.anything() }));
  });
  it('never falls back to saving without entered time if the duration endpoint fails', async () => {
    rpc.mockResolvedValue({ error: { code: 'PGRST202' } });
    await expect(submitCleanupEvidence({ ...input, durationMinutes: 90 })).rejects.toBeInstanceOf(CleanupSubmissionUncertainError);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(remove).not.toHaveBeenCalled();
  });
  it('recovers a committed submission after the response is lost without deleting its evidence', async () => {
    let saved = false;
    lookup.mockImplementation(async () => ({ data: saved ? { id: 'stable-id' } : null, error: null }));
    rpc.mockImplementation(async () => { saved = true; throw new Error('connection lost'); });
    await submitCleanupEvidence(input);
    await submitCleanupEvidence(input);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(upload).toHaveBeenCalledTimes(3);
    expect(remove).not.toHaveBeenCalled();
    expect(failure).not.toHaveBeenCalled();
    expect(rpc.mock.calls[0][1]).toMatchObject({ target_submission_id: 'stable-id', cleanup_photo_paths: ['photo-1', 'photo-2', 'photo-3'] });
  });
  it('preserves evidence and reports an uncertain outcome when reconciliation is unavailable', async () => {
    lookup.mockResolvedValueOnce({ data: null, error: null }).mockRejectedValue(new Error('offline'));
    rpc.mockRejectedValue(new Error('offline'));
    await expect(submitCleanupEvidence(input)).rejects.toBeInstanceOf(CleanupSubmissionUncertainError);
    expect(failure).toHaveBeenCalledExactlyOnceWith('clean', 'evidence_form', 'evidence_submit_unconfirmed');
    expect(remove).not.toHaveBeenCalled();
  });
  it('does not upload when it cannot check a previous submission', async () => {
    lookup.mockRejectedValue(new Error('offline'));
    await expect(submitCleanupEvidence(input)).rejects.toThrow('offline');
    expect(upload).not.toHaveBeenCalled();
    expect(failure).toHaveBeenCalledWith('clean', 'evidence_form', 'evidence_check_failed');
  });
  it('reuses durable uploaded paths when an uncertain save must be retried', async () => {
    let prepared: string[] = [];
    rpc.mockRejectedValueOnce(new Error('response lost'));
    await expect(submitCleanupEvidence({ ...input, onPrepared: async paths => { prepared = paths; } }))
      .rejects.toBeInstanceOf(CleanupSubmissionUncertainError);
    await submitCleanupEvidence({ ...input, uploadedPaths: prepared });
    expect(upload).toHaveBeenCalledTimes(3);
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc.mock.calls[1][1]).toEqual(rpc.mock.calls[0][1]);
    expect(remove).not.toHaveBeenCalled();
  });
  it('drains two concurrent uploads before rolling back a pre-save failure', async () => {
    let finishSecond: (path: string) => void = () => {};
    upload.mockImplementation(({ position }) => position === 1
      ? Promise.reject(new Error('unsafe photo'))
      : new Promise<string>(resolve => { finishSecond = resolve; }));
    const submission = submitCleanupEvidence(input);
    const rejection = expect(submission).rejects.toThrow('unsafe photo');
    await vi.waitFor(() => expect(upload).toHaveBeenCalledTimes(2));
    expect(remove).not.toHaveBeenCalled();
    finishSecond('photo-2');
    await rejection;
    expect(remove).toHaveBeenCalledWith(['photo-2']);
    expect(failure).toHaveBeenCalledWith('clean', 'evidence_form', 'photo_upload_failed');
    expect(rpc).not.toHaveBeenCalled();
    expect(upload).toHaveBeenCalledTimes(2);
  });
  it('does not hold success open for a slow funded review', async () => {
    vi.useFakeTimers();
    invoke.mockImplementation(() => new Promise(() => {}));
    const submission = submitCleanupEvidence({ ...input, isPaid: true });
    await vi.advanceTimersByTimeAsync(3001);
    await expect(submission).resolves.toBeUndefined();
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});
