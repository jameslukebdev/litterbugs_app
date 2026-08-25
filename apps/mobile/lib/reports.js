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
import { completedImpactReportFilter } from './reportVisibility';

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

export function isReportInRegion(report, region) {
  if (!region) return true;
  if (
    typeof report?.latitude !== 'number'
    || typeof report?.longitude !== 'number'
  ) {
    return false;
  }

  const latitudeRadius = Math.max(region.latitudeDelta ?? 0, 0.01) / 2;
  const longitudeRadius = Math.max(region.longitudeDelta ?? 0, 0.01) / 2;

  return (
    report.latitude >= region.latitude - latitudeRadius
    && report.latitude <= region.latitude + latitudeRadius
    && report.longitude >= region.longitude - longitudeRadius
    && report.longitude <= region.longitude + longitudeRadius
  );
}

function sortReportsByDistance(reports, origin) {
  return [...reports].sort((left, right) => {
    const leftDistance = getDistanceMiles(origin, left);
    const rightDistance = getDistanceMiles(origin, right);

    if (leftDistance == null && rightDistance == null) return 0;
    if (leftDistance == null) return 1;
    if (rightDistance == null) return -1;
    return leftDistance - rightDistance;
  });
}

export function ReportsProvider({ children }) {
  const [allReports, setAllReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [mapRegion, setMapRegion] = useState(DEFAULT_MAP_REGION);
  const [searchRegion, setSearchRegion] = useState(DEFAULT_MAP_REGION);
  const photoUrlCache = useRef(new Map());
  const { blockedIds } = useProfile();

  const refreshReports = useCallback(async ({ showRefresh = false } = {}) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    const nowIso = new Date().toISOString();
    const { data, error: reportsError } = await supabase
      .from('reports')
      .select(REPORT_SELECT)
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

  const reportsInSearchRegion = useMemo(
    () => sortReportsByDistance(
      reports.filter((report) => isReportInRegion(report, searchRegion)),
      searchRegion
    ),
    [reports, searchRegion]
  );

  const commitMapRegion = useCallback((nextRegion) => {
    setMapRegion(nextRegion);
    setSearchRegion(nextRegion);
  }, []);

  const searchMapRegion = useCallback(() => {
    setSearchRegion(mapRegion);
  }, [mapRegion]);

  const upsertReport = useCallback((nextReport) => {
    if (!nextReport?.id) return;

    setAllReports((current) => {
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

    const { data, error: photoError } = await supabase.storage
      .from('report_photos')
      .createSignedUrl(path, 60 * 60);

    if (photoError) {
      console.log('Signed report thumbnail error:', photoError);
      return null;
    }

    const signedUrl = data?.signedUrl ?? null;
    if (signedUrl) photoUrlCache.current.set(path, signedUrl);
    return signedUrl;
  }, []);

  const value = useMemo(() => ({
    reports,
    markers,
    reportsInSearchRegion,
    loading,
    refreshing,
    error,
    mapRegion,
    searchRegion,
    setMapRegion,
    commitMapRegion,
    searchMapRegion,
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
    reportsInSearchRegion,
    searchMapRegion,
    searchRegion,
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
