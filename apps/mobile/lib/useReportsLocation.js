import { useCallback, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { createReportsLocationLoader } from './reportsLocation';

export default function useReportsLocation({ enabled = true } = {}) {
  const [state, setState] = useState({ status: enabled ? 'loading' : 'idle', origin: null });
  const loader = useMemo(() => createReportsLocationLoader(Location, setState), []);
  useFocusEffect(useCallback(() => {
    if (!enabled) return;
    loader.refresh();
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active') loader.refresh();
      else loader.cancel();
    });
    return () => { loader.cancel(); subscription.remove(); };
  }, [loader, enabled]));
  return { ...state, refresh: loader.refresh };
}
