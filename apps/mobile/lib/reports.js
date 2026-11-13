import { reportPreferenceSync } from './syncedReportPreferences';
import { useSession } from './session';
import { Alert, AppState } from 'react-native';
import { loadDiscoveryReports, REPORT_SELECT } from './discoveryReports';
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
import { isVisibleReport } from './reportVisibility';
import { mergeAreaReports } from './mergeAreaReports';
import { discoveryOutcomeTracker } from './analytics';

export const DEFAULT_MAP_REGION = Object.freeze({
  latitude: 39.8283,
  longitude: -98.5795,
  latitudeDelta: 45,
  longitudeDelta: 45,
});

const ReportsContext = createContext(null);
const WHOLE_WORLD = Object.freeze({ latitude: 0, longitude: 0, latitudeDelta: 180, longitudeDelta: 360 });



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
  const { user } = useSession();
  const favoriteOwner = user?.id || 'guest';
  const [favoriteState, setFavoriteState] = useState({ owner: null, ids: [], hidden: [] });
  const favoriteIds = useMemo(() => favoriteState.owner === favoriteOwner ? favoriteState.ids : [], [favoriteState, favoriteOwner]);
  const hiddenIds = useMemo(() => favoriteState.owner === favoriteOwner ? favoriteState.hidden : [], [favoriteState, favoriteOwner]);
  const favoritesReady = favoriteState.owner === favoriteOwner;
  const favoriteRef = useRef({ owner: null, ids: [], hidden: [] });
  favoriteRef.current = { owner: favoriteOwner, ids: favoriteIds, hidden: hiddenIds };
  useEffect(() => {
    let active = true;
    const show = value => { if (active) setFavoriteState({ owner: favoriteOwner, ids: value.preferences.favorites, hidden: value.preferences.hidden }); };
    const sync = () => { if (AppState.currentState === 'active') void reportPreferenceSync.sync(favoriteOwner).then(show).catch(() => {}); };
    void reportPreferenceSync.load(favoriteOwner).then(show).then(sync).catch(() => {
      if (active) Alert.alert('Preferences unavailable', 'Your saved preferences could not be read. Please try again.');
    });
    const interval = setInterval(sync, 30000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') sync(); });
    return () => { active = false; clearInterval(interval); subscription.remove(); };
  }, [favoriteOwner]);
  const updatePreference = useCallback(async (kind, id, enabled) => {
    if (!favoritesReady || !id) return;
    const show = value => { if (favoriteRef.current.owner === favoriteOwner) {
      const next = { owner: favoriteOwner, ids: value.preferences.favorites, hidden: value.preferences.hidden };
      favoriteRef.current = next; setFavoriteState(next);
    } };
    try {
      show(await reportPreferenceSync.set(favoriteOwner, kind, id, enabled));
      const synced = await reportPreferenceSync.sync(favoriteOwner); show(synced);
      if (synced.offline && favoriteRef.current.owner === favoriteOwner) Alert.alert('Saved on this device', 'Your changes will sync when you reconnect.');
    } catch { if (favoriteRef.current.owner === favoriteOwner) Alert.alert('Preference not saved', 'Please try again.'); }
  }, [favoriteOwner, favoritesReady]);
  const toggleFavorite = useCallback(id => updatePreference('favorites', id, !favoriteRef.current.ids.includes(id)), [updatePreference]);
  const toggleHidden = useCallback(id => updatePreference('hidden', id, !favoriteRef.current.hidden.includes(id)), [updatePreference]);
  const [truncated, setTruncated] = useState(false);
  // The map area the most recent finished load covered, so first launch can wait for its pins.
  const [loadedRegion, setLoadedRegion] = useState(null);
  const requestAbort = useRef(null);
  const [allReports, setAllReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [mapRegion, setMapRegion] = useState(initialDiscovery?.region || DEFAULT_MAP_REGION);
  const [filters, setFilterState] = useState(DEFAULT_REPORT_FILTERS);
  const [searchPlace, setSearchPlace] = useState(initialDiscovery?.place || null);
  const [selectedMapReportId, setSelectedMapReportId] = useState(null);
  // Measurement only: what the next finished load answers (lib/analytics.js discovery).
  const discoveryTrigger = useRef('launch');
  const [discoveryLoad, setDiscoveryLoad] = useState(null);
  const setFilters = useCallback((next) => { discoveryTrigger.current = 'filter'; setFilterState(next); }, []);
  const selectSearchPlace = useCallback(place => { discoveryTrigger.current = 'search'; setSearchPlace(place); setMapRegion(place.region); setSelectedMapReportId(null); }, []);
  const clearSearchPlace = useCallback(() => { discoveryTrigger.current = 'search_cleared'; setSearchPlace(null); setSelectedMapReportId(null); }, []);
  useEffect(() => {
    if (mapRegion === DEFAULT_MAP_REGION) return;
    const timer = setTimeout(() => saveMapMemory(mapRegion, searchPlace), 500);
    return () => clearTimeout(timer);
  }, [mapRegion, searchPlace]);
  const requestSequence = useRef(0);
  const loadedSearchKey = useRef(null);
  const regionRef = useRef(mapRegion);
  regionRef.current = mapRegion;
  const photoUrlCache = useRef(new Map());
  const photoUrlRequests = useRef(new Map());
  const { blockedIds } = useProfile();
  const discoveryRef = useRef(null);
  discoveryRef.current = { filters, searchPlace, blockedIds, favoriteIds, hiddenIds };

  const refreshReports = useCallback(async ({ showRefresh = false, background = false } = {}) => {
    if (showRefresh) setRefreshing(true);
    else if (!background) setLoading(true);

    requestAbort.current?.abort();
    const controller = new AbortController();
    requestAbort.current = controller;
    const sequence = ++requestSequence.current;
    const area = regionRef.current;
    try {
      const search = discoveryRef.current;
      const result = await loadDiscoveryReports({ area, ...search, signal: controller.signal, includeNearby: true });
      if (sequence !== requestSequence.current) return;
      setTruncated(result.truncated);
      // Same search as the last load: keep the reports already on the map and only add new
      // ones and remove ones that are gone (lib/mergeAreaReports.js). A new search starts over.
      // Blocked, hidden and favourite reports are filtered on the phone as well, so only the
      // filters and place decide what "the same search" is.
      const searchKey = JSON.stringify([search.filters, search.searchPlace?.id ?? search.searchPlace?.label ?? null]);
      const sameSearch = loadedSearchKey.current === searchKey;
      loadedSearchKey.current = searchKey;
      setAllReports(current => (sameSearch ? mergeAreaReports(current, result.reports, area, { truncated: result.truncated }) : result.reports));
      setError(null);
      setDiscoveryLoad({ trigger: discoveryTrigger.current, truncated: Boolean(result.truncated), failed: false });
      discoveryTrigger.current = 'map_update';
    } catch {
      if (sequence === requestSequence.current) {
        setError('Reports could not be loaded. Pull to try again.');
        if (!controller.signal.aborted) setDiscoveryLoad({ trigger: discoveryTrigger.current, failed: true });
      }
    } finally {
      if (sequence === requestSequence.current) { setLoading(false); setRefreshing(false); setLoadedRegion(area); }
    }
  }, []);

  // Filters applied from the sheet arrive with that area's reports already loaded, so the
  // list updates at once and the follow-up refresh runs quietly in the background.
  const primedFilters = useRef(false);
  const applyFilters = useCallback((next, preloaded) => {
    if (preloaded) {
      requestSequence.current += 1;
      requestAbort.current?.abort();
      setAllReports(preloaded.reports);
      setTruncated(preloaded.truncated);
      setLoading(false);
      primedFilters.current = true;
    }
    setFilters(next);
  }, [setFilters]);

  useEffect(() => {
    const background = primedFilters.current;
    primedFilters.current = false;
    const timer = setTimeout(() => refreshReports({ background }), 250); // as soon after the map stops as the website
    return () => { clearTimeout(timer); requestSequence.current += 1; requestAbort.current?.abort(); };
  }, [mapRegion, filters, searchPlace, blockedIds, refreshReports, filters.favoritesOnly ? favoriteIds : null, hiddenIds]);

  useEffect(() => {
    const refresh = () => { if (AppState.currentState === 'active') void refreshReports({ background: true }); };
    const interval = setInterval(refresh, 30000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { clearInterval(interval); subscription.remove(); };
  }, [refreshReports]);

  const getReportById = useCallback(async (reportId) => {
    const { data, error: reportError } = await supabase
      .from('reports')
      .select(REPORT_SELECT)
      .eq('id', reportId)
      .eq('is_sample', false).eq('is_published', true)
      .maybeSingle();

    if (reportError) throw reportError;
    return data;
  }, []);

  const reports = useMemo(() => {
    if (blockedIds.length === 0) return allReports;
    const blocked = new Set(blockedIds);
    return allReports.filter((report) => !blocked.has(report.user_id));
  }, [allReports, blockedIds]);

  const filteredReports = useMemo(() => reports.filter((report) => matchesReportFilters(report, filters, mapRegion, favoriteIds, hiddenIds) && matchesGeography(report, mapRegion, searchPlace)), [reports, filters, mapRegion, searchPlace, favoriteIds, hiddenIds]);

  // After each finished load: matching reports in view, as fixed buckets (lib/analytics.js).
  const discoveryOutcomes = useRef(null);
  useEffect(() => {
    if (!discoveryLoad) return;
    discoveryOutcomes.current ??= discoveryOutcomeTracker();
    const filtered = Boolean(searchPlace) || Object.keys(DEFAULT_REPORT_FILTERS).some(key => filters[key] !== DEFAULT_REPORT_FILTERS[key]);
    try { discoveryOutcomes.current.loaded({ ...discoveryLoad, count: filteredReports.length, filtered }); } catch { /* optional */ }
  }, [discoveryLoad]); // only when a load finishes, with that render's counts

  // Map pins: every loaded report that matches the filters and place, not only the ones in
  // view (the Reports list and counts above stay limited to the view). Nearby pins are grouped,
  // so grouping only what was on screen reshuffled the groups each time the map stopped and the
  // list caught up with the new view. The map itself only draws what is in view.
  const mapReports = useMemo(() => reports.filter((report) => matchesReportFilters(report, filters, mapRegion, favoriteIds, hiddenIds) && matchesGeography(report, WHOLE_WORLD, searchPlace)), [reports, filters, mapRegion, searchPlace, favoriteIds, hiddenIds]);

  const markers = useMemo(
    () => mapReports
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
    [mapReports]
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
    favoriteIds, toggleFavorite, favoritesReady, hiddenIds, toggleHidden,
    restoredMap: Boolean(initialDiscovery),
    loadedRegion,
    searchPlace, selectSearchPlace, clearSearchPlace, selectedMapReportId, setSelectedMapReportId,
    reports,
    filteredReports, filters, setFilters, applyFilters, truncated,
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
    favoriteIds, toggleFavorite, favoritesReady, hiddenIds, toggleHidden,
    searchPlace, selectSearchPlace, clearSearchPlace, selectedMapReportId,
    filteredReports, filters, applyFilters, truncated,
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
    loadedRegion,
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
