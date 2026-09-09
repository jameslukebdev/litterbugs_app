import { AppState } from 'react-native';
import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { createAsyncResource } from './asyncResource';
const resources = new Map();

// Memoize load with its account/route/filter dependencies. A changed owner gets
// a new store immediately, so old account or route data never flashes on screen.
export default function useFocusedResource(load, { paged = false, enabled = true, cacheKey = null } = {}) {
  const resource = useMemo(() => {
    if (!enabled || !cacheKey) return createAsyncResource(load, { paged, enabled });
    if (!resources.has(cacheKey)) {
      if (resources.size >= 50) resources.delete(resources.keys().next().value);
      resources.set(cacheKey, createAsyncResource(load, { paged, enabled }));
    }
    return resources.get(cacheKey);
  }, [load, paged, enabled, cacheKey]);
  const state = useSyncExternalStore(resource.subscribe, resource.getSnapshot, resource.getSnapshot);
  useFocusEffect(useCallback(() => {
    resource.refresh();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') resource.refresh();
    });
    return () => { subscription.remove(); if (!cacheKey) resource.cancel(); };
  }, [resource, cacheKey]));
  return { ...state, refresh: resource.refresh, loadMore: resource.loadMore };
}
