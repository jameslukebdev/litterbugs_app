'use client';

import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import {
  EMPTY_REPORT_DRAFT,
  hasReportCoordinates,
  reportInsertFromDraft,
  type Coordinates,
  type MappableReport,
  type Report,
  type ReportDraft,
} from '@litterbugs/report-contract';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Icon } from '@/components/icon';
import { ClusterReports } from '@/components/cluster-reports';
import type { createReportClusters } from '@/lib/report-clusters';
import { PublicAccountAction, type PublicAccountActionHandle } from '@/components/public-account-action';
import Link from 'next/link';
import Image from 'next/image';
import { PublicSiteHeader } from '@/components/public-site-header';
import { IoMapOutline, IoListOutline, IoOptionsOutline } from 'react-icons/io5';
import { PlaceSearch } from '@/components/place-search';
import type { SearchPlace } from '@/lib/place-geography';
import { ReportBrowser } from '@/components/report-browser';
import { canManageReport, realUserId } from '@/lib/report-access';
import { getBrowserLocation, requireReportLocation } from '@/lib/geolocation';
import { ReportDetail } from '@/components/report-detail';
import { ResumableReportWizard } from '@/components/resumable-report-wizard';
import { cloudDrafts } from '@/lib/cloud-drafts';
import { clearPublishedReport, clearReportPublication, reportDraftLocation, loadReportPublication, saveReportPublication, type ReportPublicationJournal } from '@/lib/saved-report-draft';
import { ReportWizard } from '@/components/report-wizard';
import { FundingContributionAction } from '@/components/funding-contribution-action';
import { loadCleanupFeatureFlags, requestReportPhotoReview } from '@/lib/funding';
import { reportPreferenceSync } from '@/lib/synced-report-preferences';
import { uploadConcurrently } from '@/lib/concurrent-upload';
import { uploadSecureBrowserMedia } from '@/lib/secure-media-upload';
import { saveReportEdit } from '@/lib/save-report-edit';
import { isDiscoverableReport } from '@/lib/report-visibility';
import { resolvePlaceId } from '@/lib/place-search';
import { DEFAULT_DISCOVERY_FILTERS, loadDiscoveryReports, type DiscoveryArea, type DiscoveryFilters } from '@/lib/report-discovery';
import { readDiscoveryMemory, saveDiscoveryMemory, readMapUrl, mapUrl, readDiscoveryView } from '@/lib/discovery-memory';
import { useDataRefresh } from '@/lib/use-data-refresh';
import { createClient } from '@/lib/supabase/client';

declare global { interface Window { gm_authFailure?: () => void; } }

const EMPTY_MAP_REPORTS: MappableReport[] = [];
// Website starting viewport only: no city boundary or discovery filter.
const DEFAULT_WEB_MAP_CENTER = { latitude: 36.2168, longitude: -81.6746 };
const MAP_TYPES = ['roadmap', 'satellite', 'hybrid', 'terrain'] as const;
let mapsConfigured = false;

function markerLabel(report: MappableReport) {
  if (report.cleanup_state === 'completed') return 'Done';
  if (report.cleanup_state === 'claimed') return 'Busy';
  if (report.funded_amount_cents > 0) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(report.funded_amount_cents / 100);
  }
  return 'Open';
}

export function MapExperience({
  initialReports,
  initialUserId,
  googleMapsKey,
  googleMapsMapId,
  initialError,
}: {
  initialReports: Report[];
  initialUserId: string | null;
  googleMapsKey: string;
  googleMapsMapId: string;
  initialError: string;
}) {
  const router = useRouter();
  const requestedView = useSearchParams().get('view');
  const refreshRevision = useDataRefresh();
  const [navigationRevision, setNavigationRevision] = useState(0);
  const [desktopDetail, setDesktopDetail] = useState(false);
  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia('(min-width: 1100px)');
    const update = () => setDesktopDetail(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const mapAuthFailed = useRef(false);
  const clustersRef = useRef<ReturnType<typeof createReportClusters> | null>(null);
  const [clusterIds, setClusterIds] = useState<string[] | null>(null);
  const markersRef = useRef(new Map<string, google.maps.marker.AdvancedMarkerElement>());
  const markerGlyphsRef = useRef(new Map<string, HTMLElement>());
  const accountActionRef = useRef<PublicAccountActionHandle>(null);
  const returnToReportList = useRef(true);
  const selectedReportIdRef = useRef<string | null>(null);
  const advancedMarkerRef = useRef<typeof google.maps.marker.AdvancedMarkerElement | null>(null);
  const mapClickRef = useRef<(coordinates: Coordinates) => void>(() => undefined);
  const [filtersRequest, setFiltersRequest] = useState(0);
  const [reports, setReports] = useState<MappableReport[]>(initialReports.filter(hasReportCoordinates));
  const [visibleReports, setVisibleReports] = useState<MappableReport[]>(
    initialReports.filter(hasReportCoordinates),
  );
  const [userId, setUserId] = useState(initialUserId);
  const preferenceOwnerRef = useRef(userId ?? 'guest');
  useEffect(() => { preferenceOwnerRef.current = userId ?? 'guest'; }, [userId]);
  const [mapReady, setMapReady] = useState(false);
  const [mapTilesReady, setMapTilesReady] = useState(false);
  const [searchPlace, setSearchPlace] = useState<SearchPlace | null>(null);
  const searchPlaceRef = useRef<SearchPlace | null>(null);
  useEffect(() => {
    searchPlaceRef.current = searchPlace;
    const memory = readDiscoveryMemory();
    if (memory && mapRef.current) saveDiscoveryMemory({ ...memory, place: searchPlace });
  }, [searchPlace]);
  const [discoveryArea, setDiscoveryArea] = useState<DiscoveryArea | null>(null);
  const [discoveryFilters, setDiscoveryFilters] = useState<DiscoveryFilters>(DEFAULT_DISCOVERY_FILTERS);
  const [discoveryLoading, setDiscoveryLoading] = useState(true);
  const [discoveryTruncated, setDiscoveryTruncated] = useState(false);
  const [discoveryError, setDiscoveryError] = useState('');
  const discoveryRequest = useRef<AbortController | null>(null);
  const [mapError, setMapError] = useState(
    googleMapsKey && googleMapsMapId
      ? ''
      : 'A restricted Google Maps browser key and web map ID are required to display the map.',
  );
  const [mapTypeIndex, setMapTypeIndex] = useState(0);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [draftCoordinates, setDraftCoordinates] = useState<Coordinates | null>(null);
  const [selectingDraftLocation, setSelectingDraftLocation] = useState(false);
  const pendingPublication = useRef<{ userId: string; reportId: string; paths: string[] } | null>(null);
  const [publicationUncertain, setPublicationUncertain] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [editPhotoUrls, setEditPhotoUrls] = useState<string[]>([]);
  const openMapReportRef = useRef<(id: string) => void>(() => {});
  const [reportListOpen, setReportListOpen] = useState(requestedView !== 'map');
  const [viewRestored, setViewRestored] = useState(false);
  useEffect(() => {
    const restoreView = () => {
      if (window.location.pathname === '/report') return;
      setReportListOpen(readDiscoveryView(window.location.search, window.matchMedia?.('(max-width: 760px)').matches ?? false) === 'reports');
      setViewRestored(true);
    };
    const timer = window.setTimeout(restoreView, 0);
    window.addEventListener('popstate', restoreView);
    return () => { window.clearTimeout(timer); window.removeEventListener('popstate', restoreView); };
  }, [requestedView]);
  function switchDiscoveryView(view: 'map' | 'reports') {
    setReportListOpen(view === 'reports');
    const url = new URL(window.location.href);
    url.searchParams.set('view', view);
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }
  const [reportMode, setReportMode] = useState(false);
  const [placement, setPlacement] = useState<Coordinates | null>(null);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const locationCheck = useRef(0);
  const reportEntry = useRef(0);
  const [locationError, setLocationError] = useState('');
  const [checkingDraft, setCheckingDraft] = useState(false);
  const [previewedReportId, setPreviewedReportId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [reportUploadProgress, setReportUploadProgress] = useState('');
  const [fundingEnabled, setFundingEnabled] = useState(false);
  const [reportFunding, setReportFunding] = useState<{ report: Report; amountCents: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadCleanupFeatureFlags().then(flags => {
      if (!cancelled) setFundingEnabled(Boolean(flags.payments_enabled && flags.gemini_financial_review_enabled));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  const [reportPreferences, setReportPreferences] = useState({
    favorites: new Set<string>(),
    hidden: new Set<string>(),
  });

  const refreshReports = useCallback(async () => {
    discoveryRequest.current?.abort();
    const controller = new AbortController();
    discoveryRequest.current = controller;
    setDiscoveryLoading(true);
    setDiscoveryError('');
    const requestTimeout = window.setTimeout(() => {
      if (controller.signal.aborted) return;
      controller.abort();
      setDiscoveryError('Reports are taking too long to load. Check your connection and try again.');
      setDiscoveryLoading(false);
    }, 15000);
    try {
      const result = await loadDiscoveryReports(createClient(), { filters: discoveryFilters, area: discoveryArea, favorites: reportPreferences.favorites, hidden: reportPreferences.hidden, signal: controller.signal, geometry: searchPlace?.geometry });
      if (controller.signal.aborted) return;
      const nextReports = result.reports;
      setReports(nextReports);
      setDiscoveryTruncated(result.truncated);
      setReportFunding(current => current ? { ...current, report: nextReports.find(({ id }) => id === current.report.id) ?? current.report } : null);
      const selectedId = selectedReportIdRef.current;
      if (selectedId) {
        const { data, error } = await createClient().from('reports').select('*')
          .eq('id', selectedId).eq('is_published', true).maybeSingle();
        if (controller.signal.aborted || selectedReportIdRef.current !== selectedId) return;
        if (error) throw error;
        if (!data || !isDiscoverableReport(data)) {
          setSelectedReport(null);
          setReportListOpen(true);
          const url = new URL(window.location.href);
          url.searchParams.delete('report');
          window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`);
          setToast('This report is no longer available.');
        } else setSelectedReport(data);
      }
    } catch {
      if (!controller.signal.aborted) setDiscoveryError('Reports could not be refreshed. Check your connection and move the map or try another filter.');
    } finally {
      window.clearTimeout(requestTimeout);
      if (!controller.signal.aborted) setDiscoveryLoading(false);
    }
  }, [discoveryArea, discoveryFilters, reportPreferences, searchPlace]);

  useEffect(() => {
    if (!discoveryArea && !mapError) return;
    const timer = window.setTimeout(() => { void refreshReports(); }, 250);
    return () => { window.clearTimeout(timer); discoveryRequest.current?.abort(); };
  }, [discoveryArea, mapError, refreshReports, refreshRevision]);

  useEffect(() => () => discoveryRequest.current?.abort(), []);

  async function geocodeAddress(text: string, placeId = false): Promise<SearchPlace[]> {
    const { Geocoder } = await importLibrary('geocoding');
    try {
      const { results } = await new Geocoder().geocode(placeId ? { placeId: text } : { address: text });
      return results.slice(0, 5).map(result => ({
        id: result.place_id,
        label: result.formatted_address,
        subtitle: 'Address / area center · no boundary',
        latitude: result.geometry.location.lat(), longitude: result.geometry.location.lng(),
        bounds: result.geometry.viewport.toJSON(),
      }));
    } catch (error) {
      if ((error as { code?: string }).code === 'ZERO_RESULTS') return [];
      throw error;
    }
  }

  function selectSearchPlace(place: SearchPlace) {
    searchPlaceRef.current = place;
    const url = new URL(window.location.href); url.searchParams.set('area', place.id);
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`);
    setSearchPlace(place);
    setDiscoveryArea({ ...place.bounds, latitude: place.latitude, longitude: place.longitude });
    mapRef.current?.fitBounds(place.bounds, 60);
  }

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map?.data || !searchPlace?.geometry) return;
    const features = map.data.addGeoJson({ type: 'Feature', properties: {}, geometry: searchPlace.geometry });
    map.data.setStyle({ fillColor: '#2f7d32', fillOpacity: 0.08, strokeColor: '#2f7d32', strokeWeight: 2, clickable: false });
    return () => { features.forEach(feature => map.data.remove(feature)); };
  }, [mapReady, searchPlace]);

  const handleUserChange = useCallback((nextUserId: string | null) => {
    locationCheck.current++; reportEntry.current++; setCheckingLocation(false); setCheckingDraft(false);
    setUserId(nextUserId);
    setReportFunding(null);
    setPublicationUncertain(false);
    setDraftCoordinates(null);
    setSelectingDraftLocation(false);
    setReportMode(false);
    setEditingReport(null);
    setEditPhotoUrls([]);
    preferenceOwnerRef.current = nextUserId ?? 'guest';
    setReportPreferences({ favorites: new Set(), hidden: new Set() });
    router.refresh();
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    const owner = userId ?? 'guest';
    const show = (value: { preferences: { favorites: string[]; hidden: string[] } }) => {
      if (!cancelled && preferenceOwnerRef.current === owner) setReportPreferences({ favorites: new Set(value.preferences.favorites), hidden: new Set(value.preferences.hidden) });
    };
    void reportPreferenceSync.load(owner).then(show).then(() => reportPreferenceSync.sync(owner)).then(show)
      .catch(() => { if (!cancelled) setToast('Saved preferences could not be loaded. Please try again.'); });
    return () => { cancelled = true; };
  }, [userId, refreshRevision]);

  async function updateReportPreference(kind: 'favorites' | 'hidden', reportId: string, enabled: boolean) {
    const owner = userId ?? 'guest';
    try {
      const value = await reportPreferenceSync.set(owner, kind, reportId, enabled);
      if (preferenceOwnerRef.current !== owner) return;
      setReportPreferences({ favorites: new Set(value.preferences.favorites), hidden: new Set(value.preferences.hidden) });
      if (kind === 'hidden') setToast(enabled ? 'Report hidden. Use the Hidden filter to restore it.' : 'Report restored to search.');
      const synced = await reportPreferenceSync.sync(owner);
      if (preferenceOwnerRef.current !== owner) return;
      setReportPreferences({ favorites: new Set(synced.preferences.favorites), hidden: new Set(synced.preferences.hidden) });
      if (synced.offline) setToast('Saved on this device. Changes will sync when you reconnect.');
    } catch { if (preferenceOwnerRef.current === owner) setToast('Your preference could not be saved. Please try again.'); }
  }

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('stripe_onboarding') !== 'return') return;
    url.searchParams.delete('stripe_onboarding');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    const timeout = window.setTimeout(() => accountActionRef.current?.openAccount(), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const navigate = () => {
      if (window.location.pathname !== '/report') { locationCheck.current++; reportEntry.current++; setCheckingDraft(false); setCheckingLocation(false); setDraftCoordinates(null); setReportMode(false); setLocationError(''); setSelectingDraftLocation(false); }
      setNavigationRevision(value => value + 1);
    };
    window.addEventListener('popstate', navigate);
    return () => window.removeEventListener('popstate', navigate);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const reportId = url.searchParams.get('report') ?? '';
    let cancelled = false;
    if (reportId && selectedReportIdRef.current === reportId) return;
    async function openLinkedReport() {
      await Promise.resolve();
      if (cancelled) return;
      if (!reportId) { setSelectedReport(null); return; }
      let report = reports.find(({ id }) => id === reportId);
      if (!report) {
        const { data, error } = await createClient().from('reports').select('*').eq('id', reportId).eq('is_published', true).maybeSingle();
        if (cancelled) return;
        if (error) { setToast('The shared report could not be loaded. Please try opening its link again.'); return; }
        if (data && hasReportCoordinates(data) && isDiscoverableReport(data)) report = data;
      } else await Promise.resolve();
      if (cancelled) return;
      if (!report) { setToast('This report is no longer available.'); return; }
      setSelectedReport(report);
      mapRef.current?.panTo({ lat: report.latitude, lng: report.longitude });
      if ((mapRef.current?.getZoom() ?? 0) < 14) mapRef.current?.setZoom(14);
    }
    void openLinkedReport().catch(() => { if (!cancelled) setToast('The shared report could not be loaded. Please try opening its link again.'); });
    return () => { cancelled = true; };
  }, [reports, navigationRevision]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 5000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const initialMapReports = useRef(initialReports.filter(hasReportCoordinates));
  useEffect(() => {
    if (!googleMapsKey || !googleMapsMapId || !mapElementRef.current || mapRef.current) return;
    let cancelled = false;

    let tilesReady = false;
    const startupTimeout = window.setTimeout(() => {
      if (!cancelled && !tilesReady) setMapError('The map is taking too long to load. You can still browse reports or reload to try again.');
    }, 12000);
    const previousAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      window.clearTimeout(startupTimeout);
      if (!cancelled) { mapAuthFailed.current = true; discoveryRequest.current?.abort(); setDiscoveryArea(null); setReports(initialMapReports.current); setMapReady(false); setMapError('The map is unavailable on this address. You can still browse reports.'); }
    };
    async function startMap() {
      try {
        if (!mapsConfigured) {
          setOptions({ key: googleMapsKey, v: 'weekly', authReferrerPolicy: 'origin' });
          mapsConfigured = true;
        }
        const [{ Map }, { AdvancedMarkerElement }, { createReportClusters }] = await Promise.all([
          importLibrary('maps'),
          importLibrary('marker'),
          import('@/lib/report-clusters'),
        ]);
        if (cancelled || mapAuthFailed.current || !mapElementRef.current) return;
        const stored = readDiscoveryMemory();
        const sharedMap = readMapUrl(window.location.search);
        const areaId = new URLSearchParams(window.location.search).get('area');
        // Search is usable before Google Maps finishes loading. A choice made
        // in this session must outrank the previous URL or saved viewport.
        const selectedWhileLoading = searchPlaceRef.current;
        const memory = selectedWhileLoading
          ? { latitude: selectedWhileLoading.latitude, longitude: selectedWhileLoading.longitude, zoom: 12, place: selectedWhileLoading }
          : sharedMap ? { ...sharedMap, place: stored?.place?.id === areaId ? stored.place : null } : stored;
        if (memory) { searchPlaceRef.current = memory.place; setSearchPlace(memory.place); }
        const map = new Map(mapElementRef.current, {
          center: { lat: memory?.latitude ?? DEFAULT_WEB_MAP_CENTER.latitude, lng: memory?.longitude ?? DEFAULT_WEB_MAP_CENTER.longitude },
          zoom: memory?.zoom ?? 12,
          mapId: googleMapsMapId,
          mapTypeId: 'roadmap',
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: 'greedy',
          minZoom: 3,
        });
        advancedMarkerRef.current = AdvancedMarkerElement;
        map.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (event.latLng) mapClickRef.current({ latitude: event.latLng.lat(), longitude: event.latLng.lng() });
        });
        map.addListener('tilesloaded', () => {
          if (cancelled || mapAuthFailed.current) return;
          tilesReady = true;
          window.clearTimeout(startupTimeout);
          setMapTilesReady(true);
          setMapError('');
        });
        map.addListener('idle', () => {
          if (cancelled || mapAuthFailed.current) return;
          const bounds = map.getBounds()?.toJSON();
          const center = map.getCenter();
          if (!bounds || !center) return;
          const area = { ...bounds, latitude: center.lat(), longitude: center.lng() };
          setPlacement({ latitude: area.latitude, longitude: area.longitude });
          window.history.replaceState(window.history.state, '', mapUrl(new URL(window.location.href), { latitude: area.latitude, longitude: area.longitude, zoom: map.getZoom() ?? 12 }));
          saveDiscoveryMemory({ latitude: area.latitude, longitude: area.longitude, zoom: map.getZoom() ?? 12, place: searchPlaceRef.current });
          setDiscoveryArea(current => current && Object.keys(area).every(key => current[key as keyof DiscoveryArea] === area[key as keyof DiscoveryArea]) ? current : area);
        });
        clustersRef.current = createReportClusters(map, AdvancedMarkerElement, ids => setClusterIds(ids));
        mapRef.current = map;
        if (selectedWhileLoading) map.fitBounds(selectedWhileLoading.bounds, 60);
        setMapReady(true);
        if (areaId && memory?.place?.id !== areaId) {
          const restore = /^[45]:\d{5,12}$/.test(areaId)
            ? resolvePlaceId(areaId, AbortSignal.timeout(15000))
            : /^[A-Za-z0-9_-]{8,300}$/.test(areaId) ? geocodeAddress(areaId, true).then(places => places[0]) : Promise.resolve(null);
          void restore.then(place => {
            if (cancelled || new URLSearchParams(window.location.search).get('area') !== areaId) return;
            if (place) { searchPlaceRef.current = place; setSearchPlace(place); if (!sharedMap) map.fitBounds(place.bounds, 60); }
            else setToast('This search area could not be restored. Choose a city or address.');
          }).catch(() => { if (!cancelled) setToast('This search area could not be restored. Choose a city or address.'); });
        }
      } catch {
        window.clearTimeout(startupTimeout);
        if (!cancelled) setMapError('Google Maps could not load. Check the browser key and try again.');
      }
    }
    void startMap();
    return () => { cancelled = true; window.clearTimeout(startupTimeout); window.gm_authFailure = previousAuthFailure; clustersRef.current?.dispose(); clustersRef.current = null; mapRef.current = null; };
  }, [googleMapsKey, googleMapsMapId]);

  useEffect(() => {
    const map = mapRef.current;
    const AdvancedMarkerElement = advancedMarkerRef.current;
    if (!mapReady || mapAuthFailed.current || !map || !AdvancedMarkerElement) return;
    // Keep native marker elements attached across polling, panning and sorting.
    // Recreating unchanged pins makes the entire map flash on each result update.
    const wanted = new Set(visibleReports.map(report => report.id));
    markersRef.current.forEach((marker, id) => {
      if (wanted.has(id)) return;
      marker.map = null;
      markersRef.current.delete(id);
      markerGlyphsRef.current.delete(id);
    });
    visibleReports.forEach((report) => {
      if (mapAuthFailed.current) return;
      let marker = markersRef.current.get(report.id);
      let markerGlyph = markerGlyphsRef.current.get(report.id);
      if (!marker || !markerGlyph) {
        markerGlyph = document.createElement('span');
        try { marker = new AdvancedMarkerElement({
          position: { lat: report.latitude, lng: report.longitude },
          title: report.title || 'Litter Report',
          gmpClickable: true,
        }); } catch {
          mapAuthFailed.current = true; setMapReady(false);
          setMapError('The map could not display its pins. You can still browse reports. Reload to try the map again.');
          return;
        }
        marker.append(markerGlyph);
        markersRef.current.set(report.id, marker);
        markerGlyphsRef.current.set(report.id, markerGlyph);
        markerGlyph.addEventListener('pointerenter', () => setPreviewedReportId(report.id));
        markerGlyph.addEventListener('pointerleave', () => {
          setPreviewedReportId((current) => current === report.id ? null : current);
        });
        marker.addEventListener('gmp-click', () => {
          setPreviewedReportId(null);
          openMapReportRef.current(report.id);
        });
      }
      const position = marker.position as google.maps.LatLngLiteral;
      if (position.lat !== report.latitude || position.lng !== report.longitude) {
        marker.position = { lat: report.latitude, lng: report.longitude };
      }
      const title = report.title || 'Litter Report';
      if (marker.title !== title) marker.title = title;
      const label = markerLabel(report);
      if (markerGlyph.textContent !== label) markerGlyph.textContent = label;
      // Preserve hover/selection while changing just the report's status class.
      const statusClass = `report-map-marker-${report.cleanup_state ?? 'available'}`;
      if (markerGlyph.dataset.statusClass !== statusClass) {
        if (markerGlyph.dataset.statusClass) markerGlyph.classList.remove(markerGlyph.dataset.statusClass);
        markerGlyph.classList.add('report-map-marker', statusClass);
        markerGlyph.dataset.statusClass = statusClass;
      }
      markerGlyph.classList.toggle('report-map-marker-selected', selectedReportIdRef.current === report.id);
    });
    clustersRef.current?.update(markersRef.current, visibleReports, selectedReportIdRef.current);
  }, [mapReady, visibleReports]);

  useEffect(() => {
    selectedReportIdRef.current = selectedReport?.id ?? null;
    clustersRef.current?.select(selectedReportIdRef.current);
    markerGlyphsRef.current.forEach((glyph, reportId) => {
      glyph.classList.toggle('report-map-marker-selected', reportId === selectedReport?.id);
      glyph.classList.toggle(
        'report-map-marker-previewed',
        reportId === previewedReportId && reportId !== selectedReport?.id,
      );
    });
  }, [previewedReportId, selectedReport?.id]);

  const beginReport = useCallback((coordinates: Coordinates) => {
    if (!userId) {
      setToast('Sign in to submit a litter report. You can keep browsing without an account.');
      accountActionRef.current?.openAuth();
      return;
    }
    setDraftCoordinates(coordinates);
    setSelectingDraftLocation(false);
    setReportMode(false);
    setToast('');
  }, [userId]);

  useEffect(() => {
    mapClickRef.current = (coordinates) => {
      if (reportMode && !checkingLocation) { mapRef.current?.panTo({ lat: coordinates.latitude, lng: coordinates.longitude }); setPlacement(coordinates); setLocationError(''); }
    };
  }, [reportMode, checkingLocation]);

  const enterReportTask = useCallback(async (resume = true, signal?: AbortSignal) => {
    if (!userId) return;
    const entry = ++reportEntry.current;
    setCheckingDraft(true); setLocationError(''); setReportListOpen(false);
    setSelectedReport(null); selectedReportIdRef.current = null;
    try {
      const coordinates = await reportDraftLocation(userId);
      if (signal?.aborted || entry !== reportEntry.current) return;
      if (coordinates && resume) { setReportMode(false); setDraftCoordinates(coordinates); }
      else setReportMode(true);
    } catch { if (!signal?.aborted && entry === reportEntry.current) setToast('Your saved draft could not be checked. Check your connection and try again.'); }
    finally { if (!signal?.aborted && entry === reportEntry.current) setCheckingDraft(false); }
  }, [userId]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const compose = url.searchParams.get('compose') ?? (url.pathname === '/report' ? 'resume' : null);
    if (!userId || !compose) return;
    const controller = new AbortController();
    queueMicrotask(() => { if (!controller.signal.aborted) void enterReportTask(compose === 'resume', controller.signal); });
    url.searchParams.delete('compose');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`);
    return () => controller.abort();
  }, [userId, navigationRevision, enterReportTask]);

  function closeReportTask() {
    locationCheck.current++; reportEntry.current++; setCheckingDraft(false);
    setDraftCoordinates(null); setReportMode(false); setLocationError('');
    const url = new URL(window.location.href);
    if (url.pathname === '/report') { url.pathname = '/'; url.searchParams.delete('compose'); window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`); }
  }

  async function toggleReportMode() {
    setReportListOpen(false);
    setLocationError('');
    if(checkingDraft) return;
    if (!userId) {
      const url = new URL(window.location.href); url.pathname = '/report'; url.searchParams.delete('report');
      window.history.pushState(window.history.state, '', `${url.pathname}${url.search}`);
      accountActionRef.current?.openAuth();
      return;
    }
    if (selectingDraftLocation) {
      setSelectingDraftLocation(false);
      setReportMode(false);
      setToast('');
      return;
    }
    if (reportMode) { closeReportTask(); return; }
    const url = new URL(window.location.href); url.pathname = '/report'; url.searchParams.delete('report');
    window.history.pushState(window.history.state, '', `${url.pathname}${url.search}`);
    await enterReportTask();
  }

  function changeDraftLocation() {
    if (!draftCoordinates || pendingPublication.current) return;
    setSelectingDraftLocation(true);
    setReportListOpen(false);
    setReportMode(true);
    setLocationError('');
    setPlacement(draftCoordinates);
    mapRef.current?.panTo({ lat: draftCoordinates.latitude, lng: draftCoordinates.longitude });
  }

  async function confirmReportLocation() {
    if (checkingLocation || !mapReady) return;
    const center = mapRef.current?.getCenter();
    const chosen = center ? { latitude: center.lat(), longitude: center.lng() } : placement;
    if (!chosen) return;
    const check = ++locationCheck.current;
    setCheckingLocation(true); setLocationError('');
    try {
      await requireReportLocation(chosen);
      if (check !== locationCheck.current) return;
      const current = mapRef.current?.getCenter();
      if (current && (Math.abs(current.lat() - chosen.latitude) > 0.00001 || Math.abs(current.lng() - chosen.longitude) > 0.00001)) { setLocationError('The pin moved while checking. Confirm the new location.'); return; }
      beginReport(chosen);
    }
    catch (error) { if (check === locationCheck.current) setLocationError(error instanceof Error ? error.message : 'Location could not be checked. Try again.'); }
    finally { if (check === locationCheck.current) setCheckingLocation(false); }
  }

  async function centerOnUser() {
    try {
      const location = await getBrowserLocation();
      if (!mapReady) setDiscoveryArea({ latitude: location.latitude, longitude: location.longitude, north: Math.min(90, location.latitude + 0.1), south: Math.max(-90, location.latitude - 0.1), east: Math.min(180, location.longitude + 0.1), west: Math.max(-180, location.longitude - 0.1) });
      mapRef.current?.panTo({ lat: location.latitude, lng: location.longitude });
      mapRef.current?.setZoom(14);
    } catch {
      setToast('Unable to find your location. Check your browser permission and try again.');
    }
  }

  function toggleMapType() {
    const nextIndex = (mapTypeIndex + 1) % MAP_TYPES.length;
    setMapTypeIndex(nextIndex);
    mapRef.current?.setMapTypeId(MAP_TYPES[nextIndex] as google.maps.MapTypeId);
  }

  function openReport(report: MappableReport) {
    returnToReportList.current = reportListOpen;
    selectedReportIdRef.current = report.id;
    setSelectedReport(report);
    const url = new URL(window.location.href);
    url.searchParams.set('report', report.id);
    window.history[selectedReport ? 'replaceState' : 'pushState']({ ...window.history.state, litterbugsReportNavigation: true }, '', `${url.pathname}${url.search}`);
  }

  useEffect(() => {
    openMapReportRef.current = id => {
      const report = visibleReports.find(item => item.id === id);
      if (report) openReport(report);
    };
  });

  async function openReportById(reportId: string) {
    const report = reports.find(({ id }) => id === reportId);
    if (report) { openReport(report); return; }
    setToast('Loading report…');
    try {
      const { data, error } = await createClient().from('reports').select('*').eq('id', reportId).eq('is_published', true).eq('is_sample', false).maybeSingle();
      if (error || !data || !hasReportCoordinates(data)) throw new Error();
      setToast(''); openReport(data);
    } catch { setToast('This report could not be opened. Try again from your activity.'); }
  }

  function closeReport() {
    const returnTo = new URL(window.location.href).searchParams.get('returnTo');
    if (returnTo && ['/account/reports', '/account/activity', '/account/activity?view=history', '/account/payments', '/account/notifications'].includes(returnTo)) {
      window.location.assign(returnTo);
      return;
    }
    setSelectedReport(null);
    setReportListOpen(returnToReportList.current);
    selectedReportIdRef.current = null;
    if (window.history.state?.litterbugsReportNavigation) {
      window.history.back();
    } else {
      const url = new URL(window.location.href);
      url.searchParams.delete('report');
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }

  async function refreshFundingReview(reportId: string) {
    try { await requestReportPhotoReview(reportId); }
    finally { await refreshReports(); }
  }

  const restorePublication = useCallback((journal: ReportPublicationJournal | undefined) => {
    pendingPublication.current = journal ?? null;
    setPublicationUncertain(Boolean(journal));
  }, []);

  async function finishPublication(report: Report, contributionCents: number | null) {
    // Clear both atomically: if cleanup fails, recovery still checks the same
    // published report rather than creating a duplicate.
    try {
      if (report.user_id) {
        await cloudDrafts.discard(report.user_id, 'report');
        await clearPublishedReport(report.user_id);
      }
    } catch { /* Keep the recovery journal when local cleanup is unavailable. */ }
    pendingPublication.current = null;
    setPublicationUncertain(false);
    setDraftCoordinates(null);
    if (contributionCents != null) setReportFunding({ report, amountCents: contributionCents });
    closeReportTask();
    setToast('Report saved. Thanks for helping keep the community clean!');
    void refreshReports();
    if (fundingEnabled) void refreshFundingReview(report.id).catch(() => undefined);
  }

  async function saveReport(draft: ReportDraft, startingContributionCents: number | null) {
    const supabase = createClient();
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    const authenticatedUserId = realUserId(user);
    if (!authenticatedUserId) {
      setDraftCoordinates(null);
      setEditingReport(null);
      accountActionRef.current?.openAuth();
      return 'Sign in with a real account to save this report.';
    }

    setReportUploadProgress('');
    const uploadReportPhotos = async (reportId: string) => {
      const paths: string[] = [];
      let completed = 0;
      try {
        const ordered = await uploadConcurrently(draft.photos, async photo => {
          const path = await uploadSecureBrowserMedia({ supabase, userId: authenticatedUserId, kind: 'report', file: photo, subjectId: reportId });
          return path;
        }, path => { paths.push(path); completed += 1; setReportUploadProgress(`Uploading photos ${completed} of ${draft.photos.length}…`); });
        return { paths: ordered, error: '' };
      } catch (error) {
        if (paths.length) await supabase.storage.from('report_photos').remove(paths);
        return { paths: [] as string[], error: error instanceof Error ? error.message : 'One or more photos could not be uploaded. Please try again.' };
      }
    };

    if (editingReport) {
      const existingPhotoPaths = editingReport.photo_paths ?? [];
      if (!existingPhotoPaths.length && !draft.photos.length) {
        return 'Add at least one clear photo before saving this report.';
      }
      const uploaded = draft.photos.length
        ? await uploadReportPhotos(editingReport.id)
        : { paths: [] as string[], error: '' };
      if (uploaded.error) return uploaded.error;
      let data: Report;
      try {
        data = await saveReportEdit({ supabase, report: editingReport, draft, userId: authenticatedUserId, replacementPaths: uploaded.paths });
      } catch (error) {
        return error instanceof Error ? error.message : 'The edit could not be confirmed. Refresh the report before retrying.';
      }
      if (uploaded.paths.length && fundingEnabled) {
        void refreshFundingReview(editingReport.id).catch(() => undefined);
      }
      setSelectedReport(data);
      setEditingReport(null);
      setEditPhotoUrls([]);
      await refreshReports();
      closeReportTask();
      setToast('Report saved. Thanks for helping keep the community clean!');
      return null;
    }

    if (!draftCoordinates) return 'Choose a location on the map and try again.';
    // A lost publication response must be resolved before retrying with a new ID.
    let pending = pendingPublication.current;
    if (!pending || pending.userId !== authenticatedUserId) {
      try { pending = await loadReportPublication(authenticatedUserId) ?? null; }
      catch { return 'Your previous submission could not be checked. Please try again.'; }
      pendingPublication.current = pending;
    }
    if (pending?.userId === authenticatedUserId) {
      const { data: previous, error: readError } = await supabase.from('reports')
        .select('*').eq('id', pending.reportId).eq('user_id', authenticatedUserId).maybeSingle();
      if (readError) return 'We are still checking whether your report was published. Check your connection and try again.';
      if (previous?.is_published) {
        await finishPublication(previous, startingContributionCents);
        return null;
      }
      if (previous && hasReportCoordinates(previous)) {
        // The first request may still be committing. Retry the same row and
        // evidence: the RPC locks the row and returns an already published report.
        let origin;
        try { origin = await requireReportLocation(previous); }
        catch (error) { return error instanceof Error ? error.message : 'Your current location is required.'; }
        try { await saveReportPublication(pending); }
        catch { return 'Your browser could not save the submission recovery record. Please try again.'; }
        const { data: retriedReport, error: retryError } = await supabase.rpc('publish_report', {
          target_report_id: pending.reportId,
          target_photo_paths: pending.paths,
          current_latitude: origin.latitude,
          current_longitude: origin.longitude,
          location_captured_at: origin.capturedAt,
        });
        if (retryError) return 'Your report has not been confirmed yet. Check your connection and try again.';
        await finishPublication(retriedReport, startingContributionCents);
        return null;
      }
      await clearReportPublication(authenticatedUserId);
      pendingPublication.current = null;
      setPublicationUncertain(false);
    }
    if (!draft.photos.length) return 'Add at least one clear photo before saving this report.';
    try { await requireReportLocation(draftCoordinates); }
    catch (error) { return error instanceof Error ? error.message : 'Your current location is required to post.'; }
    let reportId: string;
    try { reportId = await cloudDrafts.begin(authenticatedUserId, 'report'); }
    catch(error) { return error instanceof Error ? error.message : 'Your draft must sync before submission. Please try again.'; }
    // The media processor verifies that the destination report belongs to the
    // caller, so create the report row before sending its photos through the
    // quarantine pipeline. Keep the reservation so another device can recover it.
    const { error: createError } = await supabase
      .from('reports')
      .upsert({
        ...reportInsertFromDraft(draft, draftCoordinates, authenticatedUserId),
        id: reportId,
        is_published: false,
        photo_paths: [],
      }, { onConflict: 'id', ignoreDuplicates: true });
    if (createError) return `Save failed: ${createError.message}`;

    const { data: reserved, error: reserveError } = await supabase.from('reports').select('*').eq('id', reportId).eq('user_id', authenticatedUserId).single();
    if (reserveError) return 'Your report reservation could not be checked. Retry to recover it.';
    if (reserved.is_published) { await finishPublication(reserved, startingContributionCents); return null; }
    const uploaded = await uploadReportPhotos(reportId);
    if (uploaded.error) {
      return uploaded.error;
    }
    let origin;
    try { origin = await requireReportLocation(draftCoordinates); }
    catch (error) {
      await supabase.storage.from('report_photos').remove(uploaded.paths);
      return error instanceof Error ? error.message : 'Your current location is required to post.';
    }
    pendingPublication.current = { userId: authenticatedUserId, reportId, paths: uploaded.paths };
    setPublicationUncertain(true);
    try { await saveReportPublication(pendingPublication.current); }
    catch {
      return 'Your browser could not save the submission recovery record. Keep this draft open and try again.';
    }
    const { data: report, error } = await supabase.rpc('publish_report', {
      target_report_id: reportId,
      target_photo_paths: uploaded.paths,
      current_latitude: origin.latitude,
      current_longitude: origin.longitude,
      location_captured_at: origin.capturedAt,
    });
    if (error) {
      // Keep the evidence until a retry establishes whether publication committed.
      return 'We could not confirm publication. Your photos are saved. Try again to check the result without creating a duplicate.';
    }
    if (!hasReportCoordinates(report)) {
      await supabase.storage.from('report_photos').remove(uploaded.paths);
      return 'The saved report is missing its map location.';
    }
    await finishPublication(report, startingContributionCents);
    return null;
  }

  async function editSelectedReport() {
    if (!selectedReport || selectedReport.user_id !== userId) return;
    const paths = selectedReport.photo_paths ?? [];
    const signed = await Promise.all(paths.map((path) => createClient().storage.from('report_photos').createSignedUrl(path, 3600)));
    setEditPhotoUrls(signed.flatMap(({ data }) => data?.signedUrl ? [data.signedUrl] : []));
    setEditingReport(selectedReport);
    setSelectedReport(null);
  }

  async function deleteSelectedReport() {
    if (!selectedReport || !userId || selectedReport.user_id !== userId) return;
    const ownerId = userId;
    if (!window.confirm('Delete report? This action cannot be undone.')) return;
    const supabase = createClient();
    if (selectedReport.photo_paths?.length) {
      const { error: storageError } = await supabase.storage.from('report_photos').remove(selectedReport.photo_paths);
      if (storageError) {
        setToast('Delete failed before the report was changed. Check your connection and try again.');
        return;
      }
    }
    const { error } = await supabase.from('reports').delete().eq('id', selectedReport.id).eq('user_id', ownerId);
    if (error) {
      setToast(`Delete failed: ${error.message}`);
      return;
    }
    setSelectedReport(null);
    await refreshReports();
    setToast('Report deleted.');
  }


  const editDraft: ReportDraft = editingReport ? {
    ...EMPTY_REPORT_DRAFT,
    title: editingReport.title ?? '',
    selectedTypes: editingReport.litter_types ?? [],
    types: editingReport.types ?? '',
    severity: editingReport.severity === 'Low' || editingReport.severity === 'Medium' || editingReport.severity === 'High' ? editingReport.severity : '',
    selectedNotes: editingReport.notes_presets ?? [],
    notes: editingReport.notes_other ?? '',
  } : EMPTY_REPORT_DRAFT;

  return (
    <main className={`map-page website-experience${!viewRestored && !requestedView ? ' discovery-default-view' : ''}${reportListOpen ? ' showing-reports' : ''}`}>
      <PublicSiteHeader activePath="/" compactMobile reportId={selectedReport?.id} action={(
        <div className="map-header-actions">
          <button className={`header-report-button${reportMode ? ' header-report-button-active' : ''}`}
            onClick={() => { setReportListOpen(false); void toggleReportMode(); }} aria-pressed={reportMode} disabled={checkingDraft || checkingLocation} aria-busy={checkingDraft || checkingLocation}
            aria-label={checkingDraft ? 'Checking saved draft' : selectingDraftLocation ? 'Keep location' : reportMode ? 'Cancel reporting' : 'Report Litter'}>
            {checkingDraft ? 'Checking…' : selectingDraftLocation ? 'Keep location' : reportMode ? 'Cancel' : 'Report Litter'}
          </button>
          <div className="map-header-account"><PublicAccountAction ref={accountActionRef} initialUserId={initialUserId}
            mobileTabs={!reportMode ? <>
              <button type="button" aria-pressed={reportListOpen} onClick={() => switchDiscoveryView('reports')}><IoListOutline aria-hidden /><span>Reports</span></button>
              <button type="button" aria-pressed={!reportListOpen} onClick={() => switchDiscoveryView('map')}><IoMapOutline aria-hidden /><span>Map</span></button>
            </> : undefined}
            onAccountDataChanged={refreshReports} onOpenReport={openReportById} onUserChange={handleUserChange}
            onResumeDraft={() => { void toggleReportMode(); }} /></div>
        </div>
      )} />
      <div className="discovery-toolbar">
        <PlaceSearch selected={searchPlace} onSelect={selectSearchPlace} onClear={() => { setSearchPlace(null); const url = new URL(window.location.href); url.searchParams.delete('area'); window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`); }} geocode={geocodeAddress} disabled={checkingLocation} />
        {!reportMode && <div className="discovery-toolbar-actions">
          <button className="secondary-button discovery-filters" onClick={() => { switchDiscoveryView('reports'); setFiltersRequest(value => value + 1); }}><IoOptionsOutline aria-hidden />Filters{Object.entries(discoveryFilters).filter(([key, value]) => value !== DEFAULT_DISCOVERY_FILTERS[key as keyof DiscoveryFilters]).length > 0 ? ` (${Object.entries(discoveryFilters).filter(([key, value]) => value !== DEFAULT_DISCOVERY_FILTERS[key as keyof DiscoveryFilters]).length})` : ''}</button>
          <div className="discovery-view-toggle" role="group" aria-label="Browse reports">
            <button aria-pressed={reportListOpen} onClick={() => switchDiscoveryView('reports')}><IoListOutline aria-hidden /><span>Reports</span></button>
            <button aria-pressed={!reportListOpen} onClick={() => switchDiscoveryView('map')}><IoMapOutline aria-hidden /><span>Map</span></button>
          </div>
        </div>}
      </div>

      {(initialError || toast) && <div className="toast" role="status">{toast || 'Some reports could not be loaded. Try refreshing the results.'}</div>}
      <div className={`map-workspace${desktopDetail && selectedReport ? ' has-report-detail' : ''}`}>
        <ReportBrowser
          reports={discoveryArea || mapError ? reports : EMPTY_MAP_REPORTS}
          filtersRequest={filtersRequest}
          onChooseArea={() => document.querySelector<HTMLInputElement>('.discovery-toolbar input')?.focus()}
          onWidenArea={() => { setSearchPlace(null); const url = new URL(window.location.href); url.searchParams.delete('area'); window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`); mapRef.current?.setZoom(Math.max(3, (mapRef.current?.getZoom() ?? 12) - 2)); }}
          onRetry={() => void refreshReports()}
          onStartReport={() => void toggleReportMode()}
          showAuthors
          onMemberBlocked={() => { void refreshReports(); }}
          onFavoriteChange={(id, favorite) => updateReportPreference('favorites', id, favorite)}
          onHiddenChange={(id, hidden) => updateReportPreference('hidden', id, hidden)}
          mapCenter={discoveryArea}
          boundary={searchPlace?.geometry}
          onDiscoveryFiltersChange={setDiscoveryFilters}
          loading={discoveryLoading}
          truncated={discoveryTruncated}
          discoveryError={discoveryError}
          open={reportListOpen}
          onToggle={() => setReportListOpen((open) => !open)}
          onSelect={openReport}
          onPreviewReport={setPreviewedReportId}
          onVisibleReportsChange={setVisibleReports}
          previewedReportId={previewedReportId}
          selectedReportId={selectedReport?.id}
          favoriteReportIds={reportPreferences.favorites}
          hiddenReportIds={reportPreferences.hidden}
        />
        <section aria-busy={!mapTilesReady && !mapError} className={`map-stage${reportMode ? ' map-stage-reporting' : ''}`} aria-label="Litterbugs report map">
          <div ref={mapElementRef} className="google-map" />
          {!mapError && <div className={`map-loading map-loading-cover${mapTilesReady ? ' map-loading-complete' : ''}`} aria-hidden={mapTilesReady} role="status" aria-label="Loading map"><Image src="/brand/litterbugs-logo.png" alt="" width={100} height={68} priority /></div>}
          {mapError && <div className="map-error"><Icon name="warning" /><strong>Map unavailable</strong><span>{mapError}</span></div>}

          {reportMode && <>
            <div className="report-placement-pin" aria-hidden="true"><Icon name="location" /></div>
            <section className="report-placement-confirm" aria-label="Choose report location">
              <div className="report-placement-instructions">
              <h1>Choose report location</h1>
              <p>Move the map or search for the litter site. The pin marks your selection.</p>
              {placement && <p className="location-coordinate">{placement.latitude.toFixed(4)}, {placement.longitude.toFixed(4)}</p>}
              <p>We’ll check that it is within 50 miles of your current location.</p>
              {locationError && <p role="alert">{locationError}</p>}
              {selectingDraftLocation && <p>Your report details and photos are kept.</p>}
              <details><summary>Prepare a draft or finish on your phone</summary><p>You can prepare a private draft here without sharing your current location. Save and confirm account sync, then open Profile → My activity in the app on your phone. Publishing still requires a fresh location check within 50 miles of this site.</p><button type="button" className="secondary-button" disabled={!mapReady || checkingLocation} onClick={() => { const center = mapRef.current?.getCenter(); const chosen = center ? { latitude: center.lat(), longitude: center.lng() } : placement; if (chosen) beginReport(chosen); }}>Prepare private draft</button></details>
              </div>
              <button className="primary-button" disabled={!mapReady || checkingLocation} onClick={() => void confirmReportLocation()}>{checkingLocation ? 'Checking location…' : 'Use this location'}</button>
            </section>
          </>}
          <div className="zoom-controls" aria-label="Map zoom controls">
            <button onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 12) + 1)} aria-label="Zoom in"><Icon name="plus" /></button>
            <button onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 12) - 1)} aria-label="Zoom out"><Icon name="minus" /></button>
          </div>
          <div className="map-action-controls">
            <button onClick={toggleMapType} aria-label={`Change map type. Current: ${MAP_TYPES[mapTypeIndex]}`} title="Change map type"><Icon name="layers" /></button>
            <button onClick={centerOnUser} aria-label="Center map on your location" title="My location"><Icon name="location" /></button>
          </div>


        </section>
        {selectedReport && <ReportDetail inline={desktopDetail} key={selectedReport.id} report={selectedReport} userId={userId} isOwner={canManageReport(selectedReport, userId)} favorite={reportPreferences.favorites.has(selectedReport.id)} hidden={reportPreferences.hidden.has(selectedReport.id)} onFavoriteChange={(favorite) => updateReportPreference('favorites', selectedReport.id, favorite)} onHiddenChange={(hidden) => updateReportPreference('hidden', selectedReport.id, hidden)} onNotify={setToast} onRequireSignIn={(intent) => { const url = new URL(window.location.href); url.searchParams.set('report', selectedReport.id); window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`); accountActionRef.current?.openAuth(intent); }} onReportChanged={refreshReports} onClose={closeReport} onEdit={() => { void editSelectedReport(); }} onDelete={() => { void deleteSelectedReport(); }} />}
      </div>

      <footer className="discovery-footer">
        <span>© {new Date().getFullYear()} Litterbugs</span>
        <nav aria-label="Footer navigation">
          <Link href="/about">About</Link><Link href="/help">Help</Link><Link href="/support">Contact</Link>
          <Link href="/cleanup-safety">Safety</Link><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link>
        </nav>
      </footer>


      {draftCoordinates && userId && <ResumableReportWizard submissionProgress={reportUploadProgress} key={userId} userId={userId} onCoordinatesChange={setDraftCoordinates} onRestorePublication={restorePublication} fundingEnabled={fundingEnabled} coordinates={draftCoordinates} selectingLocation={selectingDraftLocation} onChangeLocation={publicationUncertain ? undefined : changeDraftLocation} onClose={closeReportTask} onSubmit={saveReport} />}
      {clusterIds && <ClusterReports reports={visibleReports.filter(report => clusterIds.includes(report.id))} truncated={discoveryTruncated} onClose={() => setClusterIds(null)} onChoose={report => { setClusterIds(null); openReport(report); }} />}
      {reportFunding && <FundingContributionAction key={reportFunding.report.id} report={reportFunding.report} userId={userId} initialAmountCents={reportFunding.amountCents} startOpen onDismiss={() => setReportFunding(null)} onChanged={refreshReports} onRefreshFunding={() => refreshFundingReview(reportFunding.report.id)} />}
      {editingReport && <ReportWizard submissionProgress={reportUploadProgress} initialDraft={editDraft} isEditing existingPhotoCount={editingReport.photo_paths?.length ?? 0} existingPhotoUrls={editPhotoUrls} onClose={() => { setEditingReport(null); setEditPhotoUrls([]); }} onSubmit={saveReport} />}
    </main>
  );
}
