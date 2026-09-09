import { describe, expect, it, vi } from 'vitest';
import { createAsyncResource } from './asyncResource';
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
describe('focus-owned resources', () => {
  it('ignores late results and errors after a newer retry', async () => {
    const first = deferred(), second = deferred();
    const load = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const resource = createAsyncResource(load);
    const a = resource.refresh(), b = resource.refresh();
    second.resolve('new payment'); await b;
    first.reject(new Error('old payment')); await a;
    expect(resource.getSnapshot()).toMatchObject({ data: 'new payment', error: null, loading: false });
  });
  it('invalidates requests on blur and starts an empty store for a different account', async () => {
    const pending = deferred();
    const old = createAsyncResource(() => pending.promise), next = createAsyncResource(async () => 'other account');
    const a = old.refresh(); old.cancel(); pending.resolve('private old account'); await a;
    expect(old.getSnapshot().data).toBeNull(); expect(next.getSnapshot().data).toBeNull();
    await next.refresh(); expect(next.getSnapshot().data).toBe('other account');
  });
  it('retains pages and cursor on failure, retries and deduplicates overlapping records', async () => {
    const load = vi.fn().mockResolvedValueOnce({ items: [{ id: 'a' }], nextCursor: 'next' }).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ items: [{ id: 'a' }, { id: 'b' }], nextCursor: null });
    const resource = createAsyncResource(load, { paged: true });
    await resource.refresh(); await resource.loadMore();
    expect(resource.getSnapshot()).toMatchObject({ data: [{ id: 'a' }], nextCursor: 'next' });
    await resource.loadMore(); expect(resource.getSnapshot()).toMatchObject({ data: [{ id: 'a' }, { id: 'b' }], nextCursor: null, moreError: null });
    expect(load).toHaveBeenLastCalledWith('next');
  });
  it('prevents duplicate older-page taps and prevents a late page replacing a refreshed list', async () => {
    const pending = deferred();
    const load = vi.fn().mockResolvedValueOnce({ items: [{ id: 'a' }], nextCursor: 'older' }).mockReturnValueOnce(pending.promise).mockResolvedValueOnce({ items: [{ id: 'fresh' }], nextCursor: null });
    const resource = createAsyncResource(load, { paged: true });
    await resource.refresh(); const page = resource.loadMore(); await resource.loadMore(); await resource.refresh();
    pending.resolve({ items: [{ id: 'stale' }], nextCursor: null }); await page;
    expect(load).toHaveBeenCalledTimes(3); expect(resource.getSnapshot().data).toEqual([{ id: 'fresh' }]);
  });
  it('does not fetch disabled resources', async () => {
    const load = vi.fn(); const resource = createAsyncResource(load, { enabled: false });
    await resource.refresh(); expect(load).not.toHaveBeenCalled(); expect(resource.getSnapshot().loading).toBe(false);
  });
});
