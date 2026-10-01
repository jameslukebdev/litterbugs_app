'use client';

import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import {
  EMPTY_REPORT_DRAFT,
  FALLBACK_MAP_CENTER,
  hasReportCoordinates,
  reportInsertFromDraft,
  type Coordinates,
  type MappableReport,
  type Report,
  type ReportDraft,
} from '@litterbugs/report-contract';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Icon } from '@/components/icon';
import { PublicAccountAction, type PublicAccountActionHandle } from '@/components/public-account-action';
import Link from 'next/link';
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
import { DEFAULT_DISCOVERY_FILTERS, loadDiscoveryReports, type DiscoveryArea, type DiscoveryFilters } from '@/lib/report-discovery';
import { readDiscoveryMemory, saveDiscoveryMemory } from '@/lib/discovery-memory';
import { useDataRefresh } from '@/lib/use-data-refresh';
import { createClient } from '@/lib/supabase/client';

declare global { interface Window { gm_authFailure?: () => void; } }

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
  const refreshRevision = useDataRefresh();
  const [navigationRevision, setNavigationRevision] = useState(0);
  const mapElementRef = useRef<HTMLDivElement>(null);
  const initialMapReports = useRef(initialReports.filter(hasReportCoordinates));
  const mapRef = useRef<google.maps.Map | null>(null);
  const mapPositionChosen = useRef(false);
  const mapAuthFailed = useRef(false);
  const markersRef = useRef(new Map<string, google.maps.marker.AdvancedMarkerElement>());
  const markerGlyphsRef = useRef(new Map<string, HTMLElement>());
  const accountActionRef = useRef<PublicAccountActionHandle>(null);
  const returnToReportList = useRef(false);
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
  const [searchPlace, setSearchPlace] = useState<SearchPlace | null>(null);
  const searchPlaceRef = useRef<SearchPlace | null>(null);
  useEffect(() => {
    searchPlaceRef.current = searchPlace;
    const memory = readDiscoveryMemory();
    if (memory && mapRef.current) saveDiscoveryMemory({ ...memory, place: searchPlace });
  }, [searchPlace]);
  const [discoveryArea, setDiscoveryArea] = useState<DiscoveryArea | null>(null);
  const [discoveryFilters, setDiscoveryFilters] = useState<DiscoveryFilters>(DEFAULT_DISCOVERY_FILTERS);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
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
  const [mapPreviewId, setMapPreviewId] = useState<string | null>(null);
  const [reportListOpen, setReportListOpen] = useState(true);
  const [reportMode, setReportMode] = useState(false);
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
      if (!controller.signal.aborted) setDiscoveryLoading(false);
    }
  }, [discoveryArea, discoveryFilters, reportPreferences, searchPlace]);

  useEffect(() => {
    if (!discoveryArea && !mapError) return;
    const timer = window.setTimeout(() => { void refreshReports(); }, 250);
    return () => { window.clearTimeout(timer); discoveryRequest.current?.abort(); };
  }, [discoveryArea, mapError, refreshReports, refreshRevision]);

  useEffect(() => () => discoveryRequest.current?.abort(), []);

  async function geocodeAddress(text: string): Promise<SearchPlace[]> {
    const { Geocoder } = await importLibrary('geocoding');
    try {
      const { results } = await new Geocoder().geocode({ address: text });
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
    mapPositionChosen.current = true;
    setSearchPlace(place);
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
      setToast(kind === 'favorites'
        ? enabled ? 'Report added to favorites.' : 'Report removed from favorites.'
        : enabled ? 'Report hidden. Use the Hidden filter to restore it.' : 'Report restored to search.');
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
    const navigate = () => setNavigationRevision(value => value + 1);
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
      mapPositionChosen.current = true;
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

  useEffect(() => {
    if (!googleMapsKey || !googleMapsMapId || !mapElementRef.current || mapRef.current) return;
    let cancelled = false;

    const previousAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      if (!cancelled) { mapAuthFailed.current = true; discoveryRequest.current?.abort(); setDiscoveryArea(null); setReports(initialMapReports.current); setMapReady(false); setMapError('The map is unavailable on this address. You can still browse reports.'); }
    };
    async function startMap() {
      try {
        if (!mapsConfigured) {
          setOptions({ key: googleMapsKey, v: 'weekly', authReferrerPolicy: 'origin' });
          mapsConfigured = true;
        }
        const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([
          importLibrary('maps'),
          importLibrary('marker'),
        ]);
        if (cancelled || mapAuthFailed.current || !mapElementRef.current) return;
        const memory = readDiscoveryMemory();
        if (memory) { mapPositionChosen.current = true; searchPlaceRef.current = memory.place; setSearchPlace(memory.place); }
        const map = new Map(mapElementRef.current, {
          center: { lat: memory?.latitude ?? FALLBACK_MAP_CENTER.latitude, lng: memory?.longitude ?? FALLBACK_MAP_CENTER.longitude },
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
        map.addListener('dragstart', () => { mapPositionChosen.current = true; });
        map.addListener('idle', () => {
          if (mapAuthFailed.current) return;
          const bounds = map.getBounds()?.toJSON();
          const center = map.getCenter();
          if (!bounds || !center) return;
          const area = { ...bounds, latitude: center.lat(), longitude: center.lng() };
          saveDiscoveryMemory({ latitude: area.latitude, longitude: area.longitude, zoom: map.getZoom() ?? 12, place: searchPlaceRef.current });
          setDiscoveryArea(current => current && Object.keys(area).every(key => current[key as keyof DiscoveryArea] === area[key as keyof DiscoveryArea]) ? current : area);
        });
        mapRef.current = map;
        setMapReady(true);
        if (!memory) void getBrowserLocation().then((location) => {
          if (!cancelled && !mapAuthFailed.current && !mapPositionChosen.current) {
            map.panTo({ lat: location.latitude, lng: location.longitude });
            map.setZoom(14);
          }
        }).catch(() => {
          const seedReports = initialMapReports.current;
          if (cancelled || mapAuthFailed.current || mapPositionChosen.current || !seedReports.length) return;
          if (seedReports.length === 1) {
            map.panTo({ lat: seedReports[0].latitude, lng: seedReports[0].longitude });
            map.setZoom(14);
            return;
          }
          const bounds = new google.maps.LatLngBounds();
          seedReports.forEach((report) => bounds.extend({ lat: report.latitude, lng: report.longitude }));
          map.fitBounds(bounds, 90);
        });
      } catch {
        if (!cancelled) setMapError('Google Maps could not load. Check the browser key and try again.');
      }
    }
    void startMap();
    return () => { cancelled = true; window.gm_authFailure = previousAuthFailure; };
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
      let marker = markersRef.current.get(report.id);
      let markerGlyph = markerGlyphsRef.current.get(report.id);
      if (!marker || !markerGlyph) {
        markerGlyph = document.createElement('span');
        marker = new AdvancedMarkerElement({
          map,
          position: { lat: report.latitude, lng: report.longitude },
          title: report.title || 'Litter Report',
          gmpClickable: true,
        });
        marker.append(markerGlyph);
        markersRef.current.set(report.id, marker);
        markerGlyphsRef.current.set(report.id, markerGlyph);
        markerGlyph.addEventListener('pointerenter', () => setPreviewedReportId(report.id));
        markerGlyph.addEventListener('pointerleave', () => {
          setPreviewedReportId((current) => current === report.id ? null : current);
        });
        marker.addEventListener('gmp-click', () => {
          setPreviewedReportId(null);
          setMapPreviewId(report.id);
          if (window.matchMedia('(max-width: 760px)').matches) setReportListOpen(false);
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
  }, [mapReady, visibleReports]);

  useEffect(() => {
    selectedReportIdRef.current = selectedReport?.id ?? null;
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
      if (reportMode) void beginReport(coordinates);
    };
  }, [beginReport, reportMode]);

  useEffect(() => {
    if (!userId) return;
    const url = new URL(window.location.href);
    const compose = url.searchParams.get('compose');
    if (!compose) return;
    let cancelled = false;
    void reportDraftLocation(userId).then(coordinates => {
      if (cancelled) return;
      if (coordinates && compose === 'resume') setDraftCoordinates(coordinates);
      else { setReportMode(true); setToast('Select the litter location on the map to start your report.'); }
      url.searchParams.delete('compose');
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`);
    }).catch(() => { if (!cancelled) setToast('Your saved draft could not be loaded. Try again from your account.'); });
    return () => { cancelled = true; };
  }, [userId]);

  async function toggleReportMode() {
    if(checkingDraft) return;
    if (!userId) {
      accountActionRef.current?.openAuth();
      return;
    }
    if (selectingDraftLocation) {
      setSelectingDraftLocation(false);
      setReportMode(false);
      setToast('');
      return;
    }
    if(!reportMode) {
      setCheckingDraft(true);
      try { const savedLocation = await reportDraftLocation(userId); if(savedLocation) {setDraftCoordinates(savedLocation);return;} }
      catch {setToast('Your saved draft could not be checked. Check your connection and try again.');return;}
      finally {setCheckingDraft(false);}
    }
    setReportMode((current) => !current);
  }

  function changeDraftLocation() {
    if (!draftCoordinates || pendingPublication.current) return;
    mapPositionChosen.current = true;
    setSelectingDraftLocation(true);
    setReportMode(true);
    mapRef.current?.panTo({ lat: draftCoordinates.latitude, lng: draftCoordinates.longitude });
  }

  useEffect(() => {
    const AdvancedMarkerElement = advancedMarkerRef.current;
    if (!selectingDraftLocation || !draftCoordinates || !mapRef.current || !AdvancedMarkerElement) return;
    const marker = new AdvancedMarkerElement({
      map: mapRef.current,
      position: { lat: draftCoordinates.latitude, lng: draftCoordinates.longitude },
      title: 'Current draft location',
    });
    return () => { marker.map = null; };
  }, [draftCoordinates, selectingDraftLocation]);

  async function centerOnUser() {
    mapPositionChosen.current = true;
    try {
      const location = await getBrowserLocation();
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
    window.history.pushState({ ...window.history.state, litterbugsReportNavigation: true }, '', `${url.pathname}${url.search}`);
  }

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

  const mapPreview = visibleReports.find(report => report.id === mapPreviewId);

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
    <main className={`map-page website-experience${reportListOpen ? ' showing-reports' : ''}`}>
      <PublicSiteHeader activePath="/" action={(
        <div className="map-header-actions">
          <button className={`header-report-button${reportMode ? ' header-report-button-active' : ''}`}
            onClick={() => { setReportListOpen(false); void toggleReportMode(); }} aria-pressed={reportMode} disabled={checkingDraft} aria-busy={checkingDraft}
            aria-label={checkingDraft ? 'Checking saved draft' : selectingDraftLocation ? 'Keep location' : reportMode ? 'Cancel reporting' : 'Report litter'}>
            <span className="header-report-long">{checkingDraft ? 'Checking…' : selectingDraftLocation ? 'Keep location' : reportMode ? 'Cancel reporting' : 'Report litter'}</span>
            <span className="header-report-short">{checkingDraft ? 'Checking…' : selectingDraftLocation ? 'Keep' : reportMode ? 'Cancel' : 'Report'}</span>
          </button>
          <PublicAccountAction ref={accountActionRef} initialUserId={initialUserId}
            onAccountDataChanged={refreshReports} onOpenReport={openReportById} onUserChange={handleUserChange}
            onResumeDraft={() => { if (userId) void reportDraftLocation(userId).then(coordinates => { if (coordinates) setDraftCoordinates(coordinates); }).catch(() => setToast('Your saved report could not be loaded. Try again.')); }} />
        </div>
      )} />
      <div className="discovery-toolbar">
        <PlaceSearch selected={searchPlace} onSelect={selectSearchPlace} onClear={() => setSearchPlace(null)} geocode={geocodeAddress} disabled={!mapReady || reportMode} />
        <div className="discovery-toolbar-actions">
          <button className="secondary-button discovery-filters" onClick={() => { setReportListOpen(true); setFiltersRequest(value => value + 1); }}><IoOptionsOutline aria-hidden />Filters</button>
          <div className="discovery-view-toggle" role="group" aria-label="Browse reports">
            <button aria-pressed={reportListOpen} onClick={() => setReportListOpen(true)}><IoListOutline aria-hidden /><span>Reports</span></button>
            <button aria-pressed={!reportListOpen} onClick={() => setReportListOpen(false)}><IoMapOutline aria-hidden /><span>Map</span></button>
          </div>
        </div>
      </div>

      <div className="map-workspace">
        <ReportBrowser
          reports={reports}
          filtersRequest={filtersRequest}
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
        <section className={`map-stage${reportMode ? ' map-stage-reporting' : ''}`} aria-label="Litterbugs report map">
          <div ref={mapElementRef} className="google-map" />
          {!mapReady && !mapError && <div className="map-loading"><span className="spinner" /><span>Loading map…</span></div>}
          {mapError && <div className="map-error"><Icon name="warning" /><strong>Map unavailable</strong><span>{mapError}</span></div>}

          <div className="zoom-controls" aria-label="Map zoom controls">
            <button onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 12) + 1)} aria-label="Zoom in"><Icon name="plus" /></button>
            <button onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 12) - 1)} aria-label="Zoom out"><Icon name="minus" /></button>
          </div>
          {mapPreview && <section className="map-report-preview" aria-label="Selected map report">
            <button className="icon-button" aria-label="Close report preview" onClick={() => setMapPreviewId(null)}><Icon name="close" /></button>
            <button className="map-report-preview-content" onClick={() => { openReport(mapPreview); setMapPreviewId(null); }}><strong>{mapPreview.title || 'Litter report'}</strong><span>{mapPreview.cleanup_state === 'completed' ? 'Cleanup complete' : mapPreview.funded_amount_cents ? `${(mapPreview.funded_amount_cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} reward` : 'Volunteer cleanup'}</span><span>View report →</span></button>
          </section>}
          <div className="map-action-controls">
            <button onClick={toggleMapType} aria-label={`Change map type. Current: ${MAP_TYPES[mapTypeIndex]}`} title="Change map type"><Icon name="layers" /></button>
            <button onClick={centerOnUser} aria-label="Center map on your location" title="My location"><Icon name="location" /></button>
          </div>

          {(initialError || toast || selectingDraftLocation) && <div className={`toast ${initialError && !toast ? 'toast-warning' : ''}`} role="status">{toast || (selectingDraftLocation ? 'Choose a new spot on the map. Your report details and photos are kept.' : 'Some reports could not be loaded. The map is still available.')}</div>}
        </section>
      </div>

      <footer className="discovery-footer">
        <span>© {new Date().getFullYear()} Litterbugs</span>
        <nav aria-label="Footer navigation">
          <Link href="/about">About</Link><Link href="/help">Help</Link><Link href="/support">Contact</Link>
          <Link href="/cleanup-safety">Safety</Link><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link>
        </nav>
      </footer>

      {selectedReport && <ReportDetail key={selectedReport.id} report={selectedReport} userId={userId} isOwner={canManageReport(selectedReport, userId)} favorite={reportPreferences.favorites.has(selectedReport.id)} hidden={reportPreferences.hidden.has(selectedReport.id)} onFavoriteChange={(favorite) => updateReportPreference('favorites', selectedReport.id, favorite)} onHiddenChange={(hidden) => updateReportPreference('hidden', selectedReport.id, hidden)} onNotify={setToast} onRequireSignIn={(intent) => { const url = new URL(window.location.href); url.searchParams.set('report', selectedReport.id); window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`); accountActionRef.current?.openAuth(intent); }} onReportChanged={refreshReports} onClose={closeReport} onEdit={() => { void editSelectedReport(); }} onDelete={() => { void deleteSelectedReport(); }} />}
      {draftCoordinates && userId && <ResumableReportWizard submissionProgress={reportUploadProgress} key={userId} userId={userId} onCoordinatesChange={setDraftCoordinates} onRestorePublication={restorePublication} fundingEnabled={fundingEnabled} coordinates={draftCoordinates} selectingLocation={selectingDraftLocation} onChangeLocation={publicationUncertain ? undefined : changeDraftLocation} onClose={() => setDraftCoordinates(null)} onSubmit={saveReport} />}
      {reportFunding && <FundingContributionAction key={reportFunding.report.id} report={reportFunding.report} userId={userId} initialAmountCents={reportFunding.amountCents} startOpen onDismiss={() => setReportFunding(null)} onChanged={refreshReports} onRefreshFunding={() => refreshFundingReview(reportFunding.report.id)} />}
      {editingReport && <ReportWizard submissionProgress={reportUploadProgress} initialDraft={editDraft} isEditing existingPhotoCount={editingReport.photo_paths?.length ?? 0} existingPhotoUrls={editPhotoUrls} onClose={() => { setEditingReport(null); setEditPhotoUrls([]); }} onSubmit={saveReport} />}
    </main>
  );
}
