// One owner per screen/account/filter. Canceling invalidates results even when
// the underlying API does not support aborting a request.
export function createAsyncResource(load, { paged = false, enabled = true } = {}) {
  let sequence = 0;
  let busy = false;
  let state = { data: paged ? [] : null, loading: enabled, loadingMore: false, error: null, moreError: null, nextCursor: null, hasLoaded: false };
  const listeners = new Set();
  const publish = patch => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };
  const run = async (append = false) => {
    if (!enabled || (append && (busy || !state.nextCursor))) return;
    const request = ++sequence;
    busy = true;
    publish({ loading: !append, loadingMore: append, error: null, moreError: null });
    try {
      const result = await load(append ? state.nextCursor : null);
      if (request !== sequence) return;
      const data = paged ? result.items : result;
      publish({
        data: append ? [...new Map([...state.data, ...data].map(item => [item.id, item])).values()] : data,
        nextCursor: paged ? result.nextCursor : null,
        loading: false, loadingMore: false, hasLoaded: true,
      });
    } catch (error) {
      if (request === sequence) publish({ [append ? 'moreError' : 'error']: error, loading: false, loadingMore: false });
    } finally { if (request === sequence) busy = false; }
  };
  return {
    getSnapshot: () => state,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    refresh: () => run(),
    loadMore: () => run(true),
    cancel() { sequence += 1; busy = false; },
  };
}
