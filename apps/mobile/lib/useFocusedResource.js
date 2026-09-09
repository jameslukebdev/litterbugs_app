import { AppState } from 'react-native';
import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { createAsyncResource } from './asyncResource';

// Memoize load with its account/route/filter dependencies. A changed owner gets
// a new store immediately, so old account or route data never flashes on screen.
export default function useFocusedResource(load, { paged = false, enabled = true } = {}) {
  const resource = useMemo(() => createAsyncResource(load, { paged, enabled }), [load, paged, enabled]);
  const state = useSyncExternalStore(resource.subscribe, resource.getSnapshot, resource.getSnapshot);
  useFocusEffect(useCallback(() => {
    resource.refresh();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') resource.refresh();
    });
    return () => { subscription.remove(); resource.cancel(); };
  }, [resource]));
  return { ...state, refresh: resource.refresh, loadMore: resource.loadMore };
}
