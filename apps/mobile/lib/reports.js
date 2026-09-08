import { saveMapMemory } from './discoveryMemory';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { DEFAULT_REPORT_FILTERS, matchesReportFilters } from './reportFilters';
import { matchesGeography } from './searchGeography';
import { supabase } from './supabase';
import { useProfile } from './profile';
import { completedImpactReportFilter, isVisibleReport } from './reportVisibility';

export const DEFAULT_MAP_REGION = Object.freeze({
  latitude: 39.8283,
  longitude: -98.5795,
  latitudeDelta: 45,
  longitudeDelta: 45,
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

export function ReportsProvider({ children, initialDiscovery = null }) {
  const [allReports, setAllReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [mapRegion, setMapRegion] = useState(initialDiscovery?.region || DEFAULT_MAP_REGION);
  const [filters, setFilters] = useState(DEFAULT_REPORT_FILTERS);
  const [searchPlace, setSearchPlace] = useState(initialDiscovery?.place || null);
  const [selectedMapReportId, setSelectedMapReportId] = useState(null);
  const selectSearchPlace = useCallback(place => { setSearchPlace(place); setMapRegion(place.region); setSelectedMapReportId(null); }, []);
  const clearSearchPlace = useCallback(() => { setSearchPlace(null); setSelectedMapReportId(null); }, []);
  useEffect(() => {
    if (mapRegion === DEFAULT_MAP_REGION) return;
    const timer = setTimeout(() => saveMapMemory(mapRegion, searchPlace), 500);
    return () => clearTimeout(timer);
  }, [mapRegion, searchPlace]);
  const radiusRef = useRef(filters.radius);
  radiusRef.current = filters.radius;
  const requestSequence = useRef(0);
  const regionRef = useRef(mapRegion);
  regionRef.current = mapRegion;
  const photoUrlCache = useRef(new Map());
  const photoUrlRequests = useRef(new Map());
  const { blockedIds } = useProfile();

  const refreshReports = useCallback(async ({ showRefresh = false } = {}) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    const sequence = ++requestSequence.current;
    try {
      const area = regionRef.current;
      const latitudeSpan = Math.max(area.latitudeDelta, radiusRef.current / 69);
      const longitudeSpan = Math.max(area.longitudeDelta, radiusRef.current / (69 * Math.max(0.01, Math.cos(area.latitude * Math.PI / 180))));
      const rows = [];
      // Fetch a bounded area in stable pages; never silently accept the API's row cap.
      const nowIso = new Date().toISOString();
      for (let offset = 0; ; offset += 500) {
        let query = supabase.from('reports').select(REPORT_SELECT)
          .eq('is_sample', false).is('cancelled_at', null)
          .or(completedImpactReportFilter(nowIso))
          .gte('latitude', Math.max(-90, area.latitude - latitudeSpan))
          .lte('latitude', Math.min(90, area.latitude + latitudeSpan));
        const west = area.longitude - longitudeSpan;
        const east = area.longitude + longitudeSpan;
        if (west >= -180 && east <= 180) query = query.gte('longitude', west).lte('longitude', east);
        const { data, error: reportsError } = await query.order('id').range(offset, offset + 499);
        if (sequence !== requestSequence.current) return;
        if (reportsError) throw reportsError;
        rows.push(...(data ?? []));
        if (!data || data.length < 500) break;
      }
      setAllReports(rows);
      setError(null);
    } catch {
      if (sequence === requestSequence.current) setError('Reports could not be loaded. Pull to try again.');
    } finally {
      if (sequence === requestSequence.current) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => refreshReports(), 400);
    return () => { clearTimeout(timer); requestSequence.current += 1; };
  }, [mapRegion, filters.radius, refreshReports]);

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

  const filteredReports = useMemo(() => reports.filter((report) => matchesReportFilters(report, filters, mapRegion) && matchesGeography(report, mapRegion, searchPlace)), [reports, filters, mapRegion, searchPlace]);

  const markers = useMemo(
    () => filteredReports
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
    [filteredReports]
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

  const getReportPhotoUrl = useCallback(async (path, { force = false } = {}) => {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;

    const cached = photoUrlCache.current.get(path);
    if (!force && cached && cached.expiresAt > Date.now()) return cached.url;

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
      if (signedUrl) photoUrlCache.current.set(path, { url: signedUrl, expiresAt: Date.now() + 55 * 60 * 1000 });
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
    restoredMap: Boolean(initialDiscovery),
    searchPlace, selectSearchPlace, clearSearchPlace, selectedMapReportId, setSelectedMapReportId,
    reports,
    filteredReports, filters, setFilters,
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
    searchPlace, selectSearchPlace, clearSearchPlace, selectedMapReportId,
    filteredReports, filters,
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
