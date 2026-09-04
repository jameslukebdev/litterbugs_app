import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { supabase } from './supabase';
import { useProfile } from './profile';
import { completedImpactReportFilter, isVisibleReport } from './reportVisibility';

export const DEFAULT_MAP_REGION = Object.freeze({
  latitude: 35.6009,
  longitude: -82.554,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
});

const ReportsContext = createContext(null);

const REPORT_SELECT = `
  *,
  reporter:profiles!reports_user_id_fkey(
    id,
    display_name,
    username,
    provider_avatar_url,
    avatar_path,
    updated_at
  )
`;

export function getDistanceMiles(pointA, pointB) {
  if (!pointA || !pointB) return null;

  const values = [
    pointA.latitude,
    pointA.longitude,
    pointB.latitude,
    pointB.longitude,
  ];

  if (values.some((value) => typeof value !== 'number')) return null;

  const earthRadiusMiles = 3958.8;
  const toRadians = (degrees) => degrees * (Math.PI / 180);
  const lat1 = toRadians(pointA.latitude);
  const lon1 = toRadians(pointA.longitude);
  const lat2 = toRadians(pointB.latitude);
  const lon2 = toRadians(pointB.longitude);
  const deltaLat = lat2 - lat1;
  const deltaLon = lon2 - lon1;
  const a =
    Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMiles * c;
}

export function ReportsProvider({ children }) {
  const [allReports, setAllReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [mapRegion, setMapRegion] = useState(DEFAULT_MAP_REGION);
  const photoUrlCache = useRef(new Map());
  const photoUrlRequests = useRef(new Map());
  const { blockedIds } = useProfile();

  const refreshReports = useCallback(async ({ showRefresh = false } = {}) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    const nowIso = new Date().toISOString();
    const { data, error: reportsError } = await supabase
      .from('reports')
      .select(REPORT_SELECT)
      .eq('is_sample', false)
      .is('cancelled_at', null)
      .or(completedImpactReportFilter(nowIso));

    if (reportsError) {
      console.log('loadReports error:', reportsError);
      setError('Reports could not be loaded. Pull to try again.');
    } else {
      setAllReports(data ?? []);
      setError(null);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    refreshReports();
  }, [refreshReports]);

  const getReportById = useCallback(async (reportId) => {
    const { data, error: reportError } = await supabase
      .from('reports')
      .select(REPORT_SELECT)
      .eq('id', reportId)
      .eq('is_sample', false)
      .is('cancelled_at', null)
      .maybeSingle();

    if (reportError) throw reportError;
    return data;
  }, []);

  const reports = useMemo(() => {
    if (blockedIds.length === 0) return allReports;
    const blocked = new Set(blockedIds);
    return allReports.filter((report) => !blocked.has(report.user_id));
  }, [allReports, blockedIds]);

  const markers = useMemo(
    () => reports
      .filter(
        (report) => typeof report.latitude === 'number'
          && typeof report.longitude === 'number'
      )
      .map((report) => ({
        id: report.id,
        coordinate: {
          latitude: report.latitude,
          longitude: report.longitude,
        },
        report,
      })),
    [reports]
  );

  const commitMapRegion = useCallback((nextRegion) => {
    setMapRegion(nextRegion);
  }, []);

  const upsertReport = useCallback((nextReport) => {
    if (!nextReport?.id) return;

    setAllReports((current) => {
      if (!isVisibleReport(nextReport)) {
        return current.filter(({ id }) => id !== nextReport.id);
      }
      const reportIndex = current.findIndex(({ id }) => id === nextReport.id);
      if (reportIndex === -1) return [...current, nextReport];

      return current.map((report) => (
        report.id === nextReport.id ? nextReport : report
      ));
    });
  }, []);

  const removeReport = useCallback((reportId) => {
    setAllReports((current) => current.filter(({ id }) => id !== reportId));
  }, []);

  const getReportPhotoUrl = useCallback(async (path) => {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;

    const cached = photoUrlCache.current.get(path);
    if (cached) return cached;

    const pending = photoUrlRequests.current.get(path);
    if (pending) return pending;

    const request = (async () => {
      const { data, error: photoError } = await supabase.storage
        .from('report_photos')
        .createSignedUrl(path, 60 * 60);

      if (photoError) {
        console.log('Signed report photo error:', photoError);
        return null;
      }

      const signedUrl = data?.signedUrl ?? null;
      if (signedUrl) photoUrlCache.current.set(path, signedUrl);
      return signedUrl;
    })();

    photoUrlRequests.current.set(path, request);

    try {
      return await request;
    } finally {
      photoUrlRequests.current.delete(path);
    }
  }, []);

  const value = useMemo(() => ({
    reports,
    markers,
    loading,
    refreshing,
    error,
    mapRegion,
    setMapRegion,
    commitMapRegion,
    refreshReports,
    getReportById,
    upsertReport,
    removeReport,
    getReportPhotoUrl,
  }), [
    commitMapRegion,
    error,
    getReportById,
    getReportPhotoUrl,
    loading,
    mapRegion,
    markers,
    refreshing,
    refreshReports,
    removeReport,
    reports,
    upsertReport,
  ]);

  return (
    <ReportsContext.Provider value={value}>
      {children}
    </ReportsContext.Provider>
  );
}

export function useReports() {
  const context = useContext(ReportsContext);

  if (!context) {
    throw new Error('useReports must be used within ReportsProvider');
  }

  return context;
}
