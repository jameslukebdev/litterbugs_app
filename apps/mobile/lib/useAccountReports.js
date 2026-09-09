import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { loadAccountReports } from './accountReports';

export default function useAccountReports(userId) {
  const sequence = useRef(0);
  const [state, setState] = useState({ userId: null, reports: [], loading: true, error: false, hasLoaded: false });
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    if (!userId) { setState({ userId, reports: [], loading: false, error: false, hasLoaded: true }); return; }
    setState(current => ({ userId, reports: current.userId === userId ? current.reports : [], hasLoaded: current.userId === userId && current.hasLoaded, loading: true, error: false }));
    try {
      const reports = await loadAccountReports(userId);
      if (request === sequence.current) setState({ userId, reports, loading: false, error: false, hasLoaded: true });
    } catch {
      if (request === sequence.current) setState(current => ({ ...current, loading: false, error: true }));
    }
  }, [userId]);
  useFocusEffect(useCallback(() => { refresh(); return () => { sequence.current += 1; }; }, [refresh]));
  useEffect(() => () => { sequence.current += 1; }, []);
  return { ...(state.userId === userId ? state : { reports: [], loading: Boolean(userId), error: false, hasLoaded: false }), refresh };
}
