import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { createPhotoBatch } from '../lib/photoBatch';

const BatchContext = createContext(null);
const GroupContext = createContext(null);

// One batch per screen: its photos appear together rather than one at a time.
export function usePhotoBatch() {
  const [batch] = useState(() => createPhotoBatch());
  useEffect(() => () => batch.stop(), [batch]);
  return batch;
}

export function PhotoBatchProvider({ batch: given, children }) {
  const own = usePhotoBatch();
  return <BatchContext.Provider value={given || own}>{children}</BatchContext.Provider>;
}

// Names the list item a photo belongs to, so off-screen items don't hold visible ones back.
export function PhotoBatchGroup({ id, children }) {
  return <GroupContext.Provider value={id ?? null}>{children}</GroupContext.Provider>;
}

// A slot in the surrounding batch, or null when there is no batch (or `enabled` is false).
// A new `resetKey` (for example a different report) gives the photo a fresh slot.
export function usePhotoBatchSlot(enabled = true, resetKey) {
  const batch = useContext(BatchContext);
  const group = useContext(GroupContext);
  const slot = useMemo(
    () => (enabled && batch ? batch.createSlot(group) : null),
    [enabled, batch, group, resetKey],
  );
  useLayoutEffect(() => {
    if (!slot) return undefined;
    slot.attach();
    return () => slot.detach();
  }, [slot]);
  return slot;
}
