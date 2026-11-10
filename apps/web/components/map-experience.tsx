'use client';

import { communityReturnPath } from '@/lib/community-journey';
import { trackParticipation, trackParticipationFailure, trackWebsiteOutcome, trackMapDiscovery, reportResultBucket, trackParticipationExit, type EntrySource } from '@/lib/website-analytics';

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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Icon } from '@/components/icon';
import { ClusterReports } from '@/components/cluster-reports';
import type { createReportClusters } from '@/lib/report-clusters';
import { celebratePostedPin, hideNativeTooltip, landPin, pinKind, prepareCard, renderPinCard, renderPinGlyph, reportPinText, type PinKind } from '@/lib/map-marker-glyph';
import { prefersReducedMotion } from '@/lib/bug-motion';
import { getReportCardPhotoUrl } from '@/lib/report-photo';
import { PublicSiteFooter } from '@/components/public-site-footer';
import { PublicAccountAction, type PublicAccountActionHandle } from '@/components/public-account-action';
import { PublicSiteHeader } from '@/components/public-site-header';
import { IoMapOutline, IoGridOutline, IoOptionsOutline, IoCloseCircleOutline, IoLocationOutline } from 'react-icons/io5';
import { PlaceSearch } from '@/components/place-search';
import { ClosestReportsAction } from '@/components/closest-reports-action';
import { MapEmptyState } from '@/components/map-empty-state';
import { findClosestReport, type ClosestReport } from '@/lib/closest-report';
import { LITTER_MAP_HREF, MAP_HOME_EVENT } from '@/lib/home-map-link';
import { BOONE_MAP_BOUNDS } from '@/lib/map-preview-frame';
import type { SearchPlace } from '@/lib/place-geography';
import { ReportBrowser } from '@/components/report-browser';
import { canManageReport, realUserId } from '@/lib/report-access';
import { reportLocationFailureReason } from '@/lib/report-location-error';
import { getBrowserLocation, requireReportLocation } from '@/lib/geolocation';
import { clearReportEntryLocation, readReportEntryLocation, reportEntryLocationHref } from '@/lib/report-entry-location';
import { ReportDetail } from '@/components/report-detail';
import { ResumableReportWizard } from '@/components/resumable-report-wizard';
import { CelebrationToast } from '@/components/celebration-toast';
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
import { readDiscoveryMemory, saveDiscoveryMemory, readMapUrl, mapUrl, readDiscoveryView, readBrowserUrl, browserUrl } from '@/lib/discovery-memory';
import { useDataRefresh } from '@/lib/use-data-refresh';
import { createClient } from '@/lib/supabase/client';

declare global { interface Window { gm_authFailure?: () => void; } }

const EMPTY_MAP_REPORTS: MappableReport[] = [];
// Website starting viewport only: no city boundary or discovery filter.
const REPORT_POSTED_TOAST = 'Report posted. Thanks for helping keep the community clean!';
const DEFAULT_WEB_MAP_CENTER = { latitude: 36.2168, longitude: -81.6746 };
const MAP_TYPES = ['roadmap', 'satellite', 'hybrid', 'terrain'] as const;
const NO_FAVORITES: ReadonlySet<string> = new Set();
/**
 * Swap in new favourite or hidden lists only when their contents changed. A new list counts as a new
 * search, which blanks the cards and pins until reports reload, so a heart tap must not touch `hidden`.
 */
function keepUnchanged<T extends { favorites: Set<string>; hidden: Set<string> }>(current: T, next: { favorites: string[]; hidden: string[] }): T {
  const favorites = sameIds(current.favorites, next.favorites) ? current.favorites : new Set(next.favorites);
  const hidden = sameIds(current.hidden, next.hidden) ? current.hidden : new Set(next.hidden);
  return favorites === current.favorites && hidden === current.hidden ? current : { ...current, favorites, hidden };
}
const sameIds = (current: ReadonlySet<string>, next: readonly string[]) => current.size === new Set(next).size && next.every(id => current.has(id));
/** Same bugs as the pins: ladybug = needs a cleanup, caterpillar = being cleaned, flower = cleaned up. */
const MAP_KEY_BUGS: Record<PinKind, string> = { open: '/brand/bugs/ladybug.png', busy: '/brand/ranks/caterpillar.svg', done: '/brand/bugs/flower.png' };
let mapsConfigured = false;

export function MapExperience({
  initialReports,
  initialUserId,
  googleMapsKey,
  googleMapsMapId,
  initialError,
  initialPlace = null,
  returnToCommunity = null,
  initialView,
}: {
  initialView?: 'map';
  returnToCommunity?: string | null;
  initialPlace?: SearchPlace | null;
  initialReports: Report[];
  initialUserId: string | null;
  googleMapsKey: string;
  googleMapsMapId: string;
  initialError: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedView = searchParams.get('view') ?? initialView;
  const communityReturn = communityReturnPath(searchParams.get('returnTo')) ?? communityReturnPath(returnToCommunity);
  const entryIntent = searchParams.get('intent');
  const mapFirstEntry = entryIntent === 'locate';
  const [detailsMinimized, setDetailsMinimized] = useState(mapFirstEntry);
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
  const linkedReportFocusRef = useRef<MappableReport | null>(null);
  const advancedMarkerRef = useRef<typeof google.maps.marker.AdvancedMarkerElement | null>(null);
  const mapClickRef = useRef<(coordinates: Coordinates) => void>(() => undefined);
  const [filtersRequest, setFiltersRequest] = useState(0);
  const [filterToolbar, setFilterToolbar] = useState<HTMLDivElement | null>(null);
  const [initialMapReports] = useState(() => initialReports.filter(hasReportCoordinates));
  const [visibleReports, setVisibleReports] = useState<MappableReport[]>(EMPTY_MAP_REPORTS);
  const [userId, setUserId] = useState(initialUserId);
  const preferenceOwnerRef = useRef(userId ?? 'guest');
  useEffect(() => { preferenceOwnerRef.current = userId ?? 'guest'; }, [userId]);
  const [mapReady, setMapReady] = useState(false);
  const [mapTilesReady, setMapTilesReady] = useState(false);
  const [searchPlace, setSearchPlace] = useState<SearchPlace | null>(initialPlace);
  const searchPlaceRef = useRef<SearchPlace | null>(initialPlace);
  useEffect(() => {
    searchPlaceRef.current = searchPlace;
    const memory = readDiscoveryMemory();
    if (memory && mapRef.current) saveDiscoveryMemory({ ...memory, place: searchPlace });
  }, [searchPlace]);
  const [discoveryArea, setDiscoveryArea] = useState<DiscoveryArea | null>(null);
  const [restoredFilters, setDiscoveryFilters] = useState<DiscoveryFilters | null>(null);
  const discoveryFilters = restoredFilters ?? DEFAULT_DISCOVERY_FILTERS;
  const [closestPreview, setClosestPreview] = useState<{ report: MappableReport; filters: DiscoveryFilters } | null>(null);
  const updateDiscoveryFilters = useCallback((filters: DiscoveryFilters) => {
    setDiscoveryFilters(filters);
    setClosestPreview(current => current && Object.entries(current.filters).every(([key, value]) =>
      value === filters[key as keyof DiscoveryFilters]) ? current : null);
  }, []);
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
    setClosestPreview(null);
    setReportListOpen(view === 'reports');
    const url = new URL(window.location.href);
    url.searchParams.set('view', view);
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }
  const [reportMode, setReportMode] = useState(false);
  useEffect(() => { if (reportMode) trackParticipation('report', 'location_picker'); }, [reportMode]);
  const [placement, setPlacement] = useState<Coordinates | null>(null);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const locationCheck = useRef(0);
  const reportEntry = useRef(0);
  const [locationError, setLocationError] = useState('');
  const [checkingDraft, setCheckingDraft] = useState(false);
  const [previewedReportId, setPreviewedReportId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  // Bug motion: the lightning bug glows while finding you; the dragonfly drops the pin of a report you just posted.
  const [locating, setLocating] = useState(false);
  const [justPostedReport, setJustPostedReport] = useState<MappableReport | null>(null);
  useEffect(() => {
    if (!mapReady || !justPostedReport) return;
    const timer = window.setTimeout(() => setJustPostedReport(null), 2200);
    return () => window.clearTimeout(timer);
  }, [mapReady, justPostedReport]);
  // eslint-disable-next-line @next/next/no-img-element -- the small glowing lightning bug.
  const locatingBug = <img className="bug-glow" src="/brand/ranks/lightning-bug.svg" alt="" aria-hidden="true" width={24} height={24} />;
  // A newly posted report ends with the bug celebration instead of the plain toast.
  const [postedToast, setPostedToast] = useState('');
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
  const canSearchReports = Boolean(discoveryArea || mapError);
  // A searched place frames the map; its old Census/postal boundary must never
  // hide reports after the visitor pans or zooms beyond it.
  const geometry = undefined;
  const placeId = searchPlace?.id;
  // Favourites only change the search when the Favourites filter is on. Otherwise tapping a heart would
  // count as a new search and blank the whole list while the same reports reload.
  const searchFavorites = restoredFilters?.scope === 'favorites' ? reportPreferences.favorites : NO_FAVORITES;
  const discoverySearch = useMemo(() => canSearchReports && restoredFilters ? {
    filters: restoredFilters, area: discoveryArea, geometry, placeId,
    favorites: searchFavorites, hidden: reportPreferences.hidden,
  } : null, [canSearchReports, discoveryArea, geometry, placeId, searchFavorites, reportPreferences.hidden, restoredFilters]);
  const [discoveryResponse, setDiscoveryResponse] = useState<{
    search: NonNullable<typeof discoverySearch>;
    reports: MappableReport[];
    truncated: boolean;
    error: string;
  } | null>(null);
  const currentResponse = discoveryResponse?.search === discoverySearch ? discoveryResponse : null;
  // Keep the last result on a pan or zoom, but never across a filter or location search change.
  const displayResponse = currentResponse ?? (discoveryResponse && discoverySearch && !discoveryResponse.error
    && discoveryResponse.search.filters === discoverySearch.filters
    && discoveryResponse.search.placeId === discoverySearch.placeId
    && discoveryResponse.search.geometry === discoverySearch.geometry
    && discoveryResponse.search.favorites === discoverySearch.favorites
    && discoveryResponse.search.hidden === discoverySearch.hidden ? discoveryResponse : null);
  const measuredDiscovery = useRef<typeof discoveryResponse>(null);
  useEffect(() => {
    if (!currentResponse || !mapTilesReady || mapError || measuredDiscovery.current === currentResponse) return;
    measuredDiscovery.current = currentResponse;
    const filtered = Object.entries(currentResponse.search.filters).some(([key, value]) => value !== DEFAULT_DISCOVERY_FILTERS[key as keyof DiscoveryFilters]);
    trackMapDiscovery(currentResponse.error ? 'results_failed' : currentResponse.reports.length ? 'results_loaded' : 'results_empty', {
      surface: 'map', filtered, ...(currentResponse.error ? {} : { result_bucket: reportResultBucket(currentResponse.reports.length), truncated: currentResponse.truncated }),
    });
  }, [currentResponse, mapTilesReady, mapError]);
  const reports = discoveryResponse?.reports ?? initialMapReports;
  const discoveryTruncated = displayResponse?.truncated ?? false;

  const refreshReports = useCallback(async () => {
    if (!discoverySearch) return;
    discoveryRequest.current?.abort();
    const controller = new AbortController();
    discoveryRequest.current = controller;
    setDiscoveryResponse(current => current?.error ? null : current);
    const showDiscoveryError = (error: string) => {
      setDiscoveryResponse(current => current?.search === discoverySearch
        ? { ...current, error }
        : { search: discoverySearch, reports: discoverySearch.area ? EMPTY_MAP_REPORTS : initialMapReports, truncated: false, error });
    };
    const requestTimeout = window.setTimeout(() => {
      if (controller.signal.aborted) return;
      controller.abort();
      showDiscoveryError('Reports are taking too long to load. Check your connection and try again.');
    }, 15000);
    try {
      const result = await loadDiscoveryReports(createClient(), { ...discoverySearch, signal: controller.signal });
      if (controller.signal.aborted) return;
      const nextReports = result.reports;
      setDiscoveryResponse({ search: discoverySearch, reports: nextReports, truncated: result.truncated, error: '' });
      setReportFunding(current => current ? { ...current, report: nextReports.find(({ id }) => id === current.report.id) ?? current.report } : null);
      const selectedId = selectedReportIdRef.current;
      if (selectedId) {
        const { data, error } = await createClient().from('reports').select('*')
          .eq('id', selectedId).eq('is_published', true).maybeSingle();
        if (controller.signal.aborted || selectedReportIdRef.current !== selectedId) return;
        if (error) throw error;
        if (!data || !hasReportCoordinates(data) || !isDiscoverableReport(data)) {
          setSelectedReport(null);
          setReportListOpen(true);
          const url = new URL(window.location.href);
          url.searchParams.delete('report');
          window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
          setToast('This report is no longer available.');
        } else setSelectedReport(data);
      }
    } catch {
      if (!controller.signal.aborted) showDiscoveryError('Reports could not be refreshed. Check your connection and move the map or try another filter.');
    } finally {
      window.clearTimeout(requestTimeout);
    }
  }, [discoverySearch, initialMapReports]);

  useEffect(() => {
    if (!discoverySearch) return;
    const timer = window.setTimeout(() => { void refreshReports(); }, 250);
    return () => { window.clearTimeout(timer); discoveryRequest.current?.abort(); };
  }, [discoverySearch, refreshReports, refreshRevision]);

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
    setClosestPreview(null);
    searchPlaceRef.current = place;
    const url = new URL(window.location.href); url.searchParams.set('area', place.id);
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    setSearchPlace(place);
    setDiscoveryArea({ ...place.bounds, latitude: place.latitude, longitude: place.longitude });
    mapRef.current?.fitBounds(place.bounds, 60);
  }

  function clearSearchPlace() {
    searchPlaceRef.current = null;
    setSearchPlace(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('area');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }

  function showClosestReport({ report }: ClosestReport) {
    if (!mapRef.current) return;
    clearSearchPlace();
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'map');
    const memory = readBrowserUrl(url.search);
    const filters = { ...discoveryFilters, radius: 0 as const };
    const next = browserUrl(url, { filters, sort: memory?.sort ?? 'newest', scroll: 0 });
    window.history.replaceState(window.history.state, '', next);
    // Keep the existing URL-backed filter controls in sync with the explicitly
    // confirmed distance change, including the hidden Reports panel.
    window.dispatchEvent(new PopStateEvent('popstate'));
    setClosestPreview({ report, filters });
    setReportListOpen(false);
    mapRef.current.setZoom(14);
    mapRef.current.panTo({ lat: report.latitude, lng: report.longitude });
  }

  useEffect(() => {
    function openHomeMap(event: Event) {
      event.preventDefault();
      const map = mapRef.current;
      searchPlaceRef.current = null;
      setSearchPlace(null);
      linkedReportFocusRef.current = null;
      setSelectedReport(null);
      setClosestPreview(null);
      setReportListOpen(false);
      window.history.replaceState(window.history.state, '', LITTER_MAP_HREF);
      window.dispatchEvent(new PopStateEvent('popstate'));
      map?.fitBounds(BOONE_MAP_BOUNDS, 32);
    }
    window.addEventListener(MAP_HOME_EVENT, openHomeMap);
    return () => window.removeEventListener(MAP_HOME_EVENT, openHomeMap);
  }, []);

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
      if (cancelled || preferenceOwnerRef.current !== owner) return;
      // The background refresh reloads these every 30 seconds. Keep the same Sets when nothing changed:
      // new Sets would count as a new search, which blanks the pins and map key until reports reload.
      setReportPreferences(current => keepUnchanged(current, value.preferences));
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
      setReportPreferences(current => keepUnchanged(current, value.preferences));
      if (kind === 'hidden' && enabled) setClosestPreview(current => current?.report.id === reportId ? null : current);
      if (kind === 'hidden') setToast(enabled ? 'Report hidden. Use the Hidden filter to restore it.' : 'Report restored to search.');
      const synced = await reportPreferenceSync.sync(owner);
      if (preferenceOwnerRef.current !== owner) return;
      setReportPreferences(current => keepUnchanged(current, synced.preferences));
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

  const measuredLinkedReport = useRef<string | null>(null);
  useEffect(() => {
    const url = new URL(window.location.href);
    const reportId = url.searchParams.get('report') ?? '';
    if (!reportId) measuredLinkedReport.current = null;
    let cancelled = false;
    if (reportId && selectedReportIdRef.current === reportId) return;
    async function openLinkedReport() {
      await Promise.resolve();
      if (cancelled) return;
      if (!reportId) { linkedReportFocusRef.current = null; setSelectedReport(null); return; }
      let report = reports.find(({ id }) => id === reportId);
      if (!report) {
        const { data, error } = await createClient().from('reports').select('*').eq('id', reportId).eq('is_published', true).maybeSingle();
        if (cancelled) return;
        if (error) { setToast('The shared report could not be loaded. Please try opening its link again.'); return; }
        if (data && hasReportCoordinates(data) && isDiscoverableReport(data)) report = data;
      } else await Promise.resolve();
      if (cancelled) return;
      if (!report) { setToast('This report is no longer available.'); return; }
      if (measuredLinkedReport.current !== reportId) {
        measuredLinkedReport.current = reportId;
        trackMapDiscovery('report_opened', { source: 'report_link' });
      }
      linkedReportFocusRef.current = report;
      setDetailsMinimized(url.searchParams.get('intent') === 'locate');
      if (url.searchParams.get('intent') === 'locate') setReportListOpen(false);
      setSelectedReport(report);
    }
    void openLinkedReport().catch(() => { if (!cancelled) setToast('The shared report could not be loaded. Please try opening its link again.'); });
    return () => { cancelled = true; };
  }, [reports, navigationRevision]);

  // Report details can arrive before the map library. Keep the requested
  // location until both are ready instead of losing the initial pan.
  useEffect(() => {
    const report = linkedReportFocusRef.current;
    const map = mapRef.current;
    if (!mapReady || !map || !report || selectedReport?.id !== report.id) return;
    map.panTo({ lat: report.latitude, lng: report.longitude });
    if ((map.getZoom() ?? 0) < 14) map.setZoom(14);
    linkedReportFocusRef.current = null;
  }, [mapReady, selectedReport?.id]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 5000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

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
      if (!cancelled) { mapAuthFailed.current = true; discoveryRequest.current?.abort(); setDiscoveryArea(null); setMapReady(false); setMapError('The map is unavailable on this address. You can still browse reports.'); }
    };
    async function startMap() {
      try {
        if (!mapsConfigured && (typeof google === 'undefined' || !google.maps?.importLibrary)) {
          setOptions({ key: googleMapsKey, v: 'weekly', authReferrerPolicy: 'origin' });
          mapsConfigured = true;
        }
        const [{ Map }, { AdvancedMarkerElement }, { createReportClusters }] = await Promise.all([
          importLibrary('maps'),
          importLibrary('marker'),
          import('@/lib/report-clusters'),
        ]);
        if (cancelled || mapAuthFailed.current || !mapElementRef.current) return;
        const storedMemory = readDiscoveryMemory();
        const sharedMap = readMapUrl(window.location.search, window.location.hash);
        const areaId = new URLSearchParams(window.location.search).get('area');
        // A report-only link should not inherit a different city's boundary.
        const stored = storedMemory && new URLSearchParams(window.location.search).has('report') && !areaId
          ? { ...storedMemory, place: null }
          : storedMemory;
        // Search is usable before Google Maps finishes loading. A choice made
        // in this session must outrank the previous URL or saved viewport.
        const selectedWhileLoading = searchPlaceRef.current;
        const memory = selectedWhileLoading
          ? { latitude: selectedWhileLoading.latitude, longitude: selectedWhileLoading.longitude, zoom: 12, place: selectedWhileLoading }
          : sharedMap ? { ...sharedMap, place: stored?.place?.id === areaId ? stored.place : null } : stored;
        if (memory) { searchPlaceRef.current = memory.place; setSearchPlace(memory.place); }
        const linkedReport = initialMapReports.find(report => report.id === new URLSearchParams(window.location.search).get('report'));
        const confirmedPin = window.location.pathname === '/report' ? readReportEntryLocation(new URLSearchParams(window.location.search)) : null;
        const map = new Map(mapElementRef.current, {
          center: { lat: linkedReport?.latitude ?? confirmedPin?.latitude ?? memory?.latitude ?? DEFAULT_WEB_MAP_CENTER.latitude, lng: linkedReport?.longitude ?? confirmedPin?.longitude ?? memory?.longitude ?? DEFAULT_WEB_MAP_CENTER.longitude },
          zoom: linkedReport ? Math.max(14, memory?.zoom ?? 14) : memory?.zoom ?? 12,
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
        map.addListener('dragstart', () => setClosestPreview(null));
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
          const zoom = map.getZoom() ?? 12;
          window.history.replaceState(window.history.state, '', mapUrl(new URL(window.location.href), { latitude: area.latitude, longitude: area.longitude, zoom }));
          saveDiscoveryMemory({ latitude: area.latitude, longitude: area.longitude, zoom, place: searchPlaceRef.current });
          setDiscoveryArea(current => current && Object.keys(area).every(key => current[key as keyof DiscoveryArea] === area[key as keyof DiscoveryArea]) ? current : area);
        });
        clustersRef.current = createReportClusters(map, AdvancedMarkerElement, ids => setClusterIds(ids));
        mapRef.current = map;
        if (!confirmedPin && selectedWhileLoading && !new URLSearchParams(window.location.search).has('report')) map.fitBounds(selectedWhileLoading.bounds, 60);
        else if (!confirmedPin && new URLSearchParams(window.location.search).get('entry') === 'boone' && !window.location.hash && !linkedReport) map.fitBounds(BOONE_MAP_BOUNDS, 32);
        setMapReady(true);
        if (areaId && memory?.place?.id !== areaId) {
          const restore = /^[45]:\d{5,12}$/.test(areaId)
            ? resolvePlaceId(areaId, AbortSignal.timeout(15000))
            : /^[A-Za-z0-9_-]{8,300}$/.test(areaId) ? geocodeAddress(areaId, true).then(places => places[0]) : Promise.resolve(null);
          void restore.then(place => {
            if (cancelled || new URLSearchParams(window.location.search).get('area') !== areaId) return;
            if (place) { searchPlaceRef.current = place; setSearchPlace(place); if (!confirmedPin && !sharedMap && !new URLSearchParams(window.location.search).has('report')) map.fitBounds(place.bounds, 60); }
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
  }, [googleMapsKey, googleMapsMapId, initialMapReports]);

  useEffect(() => {
    const map = mapRef.current;
    const AdvancedMarkerElement = advancedMarkerRef.current;
    if (!mapReady || mapAuthFailed.current || !map || !AdvancedMarkerElement) return;
    // Keep native marker elements attached across polling, panning and sorting.
    // Recreating unchanged pins makes the entire map flash on each result update.
    // A direct location request must retain its pin even when saved discovery
    // filters exclude that report (for example, Available versus Completed).
    let mapReports = mapFirstEntry && selectedReport && hasReportCoordinates(selectedReport) && !visibleReports.some(report => report.id === selectedReport.id)
      ? [...visibleReports, selectedReport] : visibleReports;
    if (justPostedReport && !mapReports.some(report => report.id === justPostedReport.id)) mapReports = [...mapReports, justPostedReport];
    if (closestPreview && !mapReports.some(report => report.id === closestPreview.report.id)) mapReports = [...mapReports, closestPreview.report];
    const wanted = new Set(mapReports.map(report => report.id));
    markersRef.current.forEach((marker, id) => {
      if (wanted.has(id)) return;
      marker.map = null;
      markersRef.current.delete(id);
      markerGlyphsRef.current.delete(id);
    });
    mapReports.forEach((report) => {
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
        hideNativeTooltip(marker, report.title || 'Litter Report');
        marker.append(markerGlyph);
        markersRef.current.set(report.id, marker);
        markerGlyphsRef.current.set(report.id, markerGlyph);
        const hovered = marker;
        markerGlyph.addEventListener('pointerenter', (event) => {
          setPreviewedReportId(report.id);
          if (event.pointerType !== 'mouse') return;
          // Lift the hovered pin above its neighbours so its card isn't covered.
          hovered.zIndex = 5000;
          prepareCard(event.currentTarget as HTMLElement);
        });
        markerGlyph.addEventListener('pointerleave', event => {
          if (!(event.currentTarget as HTMLElement).classList.contains('report-map-marker-closest')) hovered.zIndex = null;
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
      if (marker.getAttribute('aria-label') !== title) { marker.title = title; hideNativeTooltip(marker, title); }
      const pin = reportPinText(report);
      renderPinGlyph(markerGlyph, pin.kind, pin.text, pin.visible);
      if (justPostedReport?.id === report.id && !markerGlyph.classList.contains('bug-pin-posted')) celebratePostedPin(markerGlyph);
      const photoPath = report.photo_paths?.[0];
      renderPinCard(markerGlyph, report, report.cleanup_state === 'completed'
        ? `/reports/${encodeURIComponent(report.id)}/photo/after?width=640`
        : photoPath ? getReportCardPhotoUrl(photoPath) : null);
      // Preserve hover/selection while changing just the report's status class.
      const statusClass = `report-map-marker-${report.cleanup_state ?? 'available'}`;
      if (markerGlyph.dataset.statusClass !== statusClass) {
        if (markerGlyph.dataset.statusClass) markerGlyph.classList.remove(markerGlyph.dataset.statusClass);
        markerGlyph.classList.add('report-map-marker', statusClass);
        markerGlyph.dataset.statusClass = statusClass;
      }
      markerGlyph.classList.toggle('report-map-marker-selected', selectedReportIdRef.current === report.id);
      const showClosest = closestPreview?.report.id === report.id && selectedReport?.id !== report.id;
      const wasClosest = markerGlyph.classList.contains('report-map-marker-closest');
      markerGlyph.classList.toggle('report-map-marker-closest', showClosest);
      if (showClosest) {
        marker.zIndex = 5001;
        prepareCard(markerGlyph);
        if (!wasClosest && !marker.map) landPin(markerGlyph, 0);
      } else if (wasClosest) {
        marker.zIndex = null;
      }
    });
    clustersRef.current?.update(markersRef.current, mapReports, selectedReportIdRef.current, justPostedReport?.id, closestPreview?.report.id);
  }, [mapReady, visibleReports, mapFirstEntry, selectedReport, justPostedReport, closestPreview]);

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

  // The map key doubles as a live count of what's in view, like the homepage preview.
  const mapKey = useMemo(() => {
    const counts: Record<PinKind, number> = { open: 0, busy: 0, done: 0 };
    for (const report of visibleReports) counts[pinKind(report.cleanup_state)]++;
    return ([
      ['open', counts.open, 'need a cleanup', 'needs a cleanup', 'Open'],
      ['busy', counts.busy, 'being cleaned', 'being cleaned', 'Cleaning'],
      ['done', counts.done, 'cleaned up', 'cleaned up', 'Done'],
    ] as const).filter(([, count]) => count > 0);
  }, [visibleReports]);

  const beginReport = useCallback((coordinates: Coordinates) => {
    if (!userId) {
      window.history.replaceState(window.history.state, '', reportEntryLocationHref(new URL(window.location.href), coordinates));
      accountActionRef.current?.openAuth('report');
      return;
    }
    setDraftCoordinates(coordinates);
    setSelectingDraftLocation(false);
    setReportMode(false);
    setToast('');
  }, [userId]);

  useEffect(() => {
    mapClickRef.current = (coordinates) => {
      setClosestPreview(null);
      if (reportMode && !checkingLocation) { mapRef.current?.panTo({ lat: coordinates.latitude, lng: coordinates.longitude }); setPlacement(coordinates); setLocationError(''); }
    };
  }, [reportMode, checkingLocation]);

  const enterReportTask = useCallback(async (resume = true, signal?: AbortSignal) => {
    const entry = ++reportEntry.current;
    setClosestPreview(null);
    setCheckingDraft(true); setLocationError(''); setReportListOpen(false);
    setSelectedReport(null); selectedReportIdRef.current = null;
    try {
      const confirmedPin = window.location.pathname === '/report' ? readReportEntryLocation(new URLSearchParams(window.location.search)) : null;
      if (confirmedPin) {
        setPlacement(confirmedPin);
        if (userId) { setDraftCoordinates(confirmedPin); setReportMode(false); }
        else { setReportMode(true); accountActionRef.current?.openAuth('report'); }
        return;
      }
      if (!userId) { setReportMode(true); return; }
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
    if (!compose) return;
    const controller = new AbortController();
    queueMicrotask(() => { if (!controller.signal.aborted) void enterReportTask(compose === 'resume', controller.signal); });
    url.searchParams.delete('compose');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    return () => controller.abort();
  }, [userId, navigationRevision, enterReportTask]);

  const closeReportTask = useCallback(() => {
    locationCheck.current++; reportEntry.current++; setCheckingDraft(false); setCheckingLocation(false); setSelectingDraftLocation(false);
    setDraftCoordinates(null); setReportMode(false); setLocationError('');
    const url = new URL(window.location.href);
    clearReportEntryLocation(url);
    if (url.pathname === '/report' && communityReturn) { window.location.assign(communityReturn); return; }
    if (url.pathname === '/report') { url.pathname = '/map'; url.searchParams.delete('compose'); window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`); }
  }, [communityReturn]);

  const cancelLocationSelection = useCallback(() => {
    if (selectingDraftLocation) {
      locationCheck.current++;
      setCheckingLocation(false);
      setSelectingDraftLocation(false);
      setReportMode(false);
      setLocationError('');
    } else {
      trackParticipationExit('report', 'location_picker', 'cancelled');
      closeReportTask();
      window.requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('.map-report-button')?.focus());
    }
  }, [selectingDraftLocation, closeReportTask]);

  useEffect(() => {
    if (!reportMode) return;
    function onKeyDown(event: KeyboardEvent) {
      // Let search suggestions and other controls handle their own Escape first.
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (event.target instanceof Element && event.target.closest('input, textarea, [role="combobox"]')) return;
      event.preventDefault();
      cancelLocationSelection();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [reportMode, cancelLocationSelection]);

  async function toggleReportMode() {
    setReportListOpen(false);
    setLocationError('');
    if(checkingDraft) return;
    if (!reportMode && !selectingDraftLocation) trackParticipation('report', 'action_tapped', 'map_action');
    if (selectingDraftLocation) {
      setSelectingDraftLocation(false);
      setReportMode(false);
      setToast('');
      return;
    }
    if (reportMode) { trackParticipationExit('report', 'location_picker', 'cancelled'); closeReportTask(); return; }
    const url = new URL(window.location.href); url.pathname = '/report'; url.searchParams.delete('report');
    window.history.pushState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
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

  function currentReportPin() {
    const center = mapRef.current?.getCenter();
    return center ? { latitude: center.lat(), longitude: center.lng() } : placement;
  }

  function continueReportAsDraft() {
    const chosen = currentReportPin();
    if (chosen) beginReport(chosen);
  }

  async function confirmReportLocation() {
    if (checkingLocation || !mapReady) return;
    const chosen = currentReportPin();
    if (!chosen) return;
    if (!userId) {
      trackParticipation('report', 'location_confirmed');
      beginReport(chosen);
      return;
    }
    const check = ++locationCheck.current;
    setCheckingLocation(true); setLocationError('');
    try {
      await requireReportLocation(chosen);
      if (check !== locationCheck.current) return;
      const current = mapRef.current?.getCenter();
      if (current && (Math.abs(current.lat() - chosen.latitude) > 0.00001 || Math.abs(current.lng() - chosen.longitude) > 0.00001)) { setLocationError('The pin moved while checking. Confirm the new location.'); return; }
      trackParticipation('report', 'location_confirmed');
      beginReport(chosen);
    }
    catch (error) { if (check === locationCheck.current) { trackParticipationFailure('report', 'location_picker', reportLocationFailureReason(error)); setLocationError(error instanceof Error ? error.message : 'Location could not be checked. Try again.'); } }
    finally { if (check === locationCheck.current) setCheckingLocation(false); }
  }

  async function centerOnUser() {
    setClosestPreview(null);
    setLocating(true);
    try {
      const location = await getBrowserLocation();
      if (!mapReady) setDiscoveryArea({ latitude: location.latitude, longitude: location.longitude, north: Math.min(90, location.latitude + 0.1), south: Math.max(-90, location.latitude - 0.1), east: Math.min(180, location.longitude + 0.1), west: Math.max(-180, location.longitude - 0.1) });
      mapRef.current?.panTo({ lat: location.latitude, lng: location.longitude });
      mapRef.current?.setZoom(14);
    } catch {
      setToast('Unable to find your location. Check your browser permission and try again.');
    } finally { setLocating(false); }
  }

  function toggleMapType() {
    const nextIndex = (mapTypeIndex + 1) % MAP_TYPES.length;
    setMapTypeIndex(nextIndex);
    mapRef.current?.setMapTypeId(MAP_TYPES[nextIndex] as google.maps.MapTypeId);
  }

  function openReport(report: MappableReport, source: EntrySource = 'report_list') {
    trackMapDiscovery('report_opened', { source });
    setClosestPreview(current => current?.report.id === report.id ? current : null);
    setDetailsMinimized(false);
    returnToReportList.current = reportListOpen;
    selectedReportIdRef.current = report.id;
    setSelectedReport(report);
    const url = new URL(window.location.href);
    if (url.searchParams.get('report') !== report.id && ['fund', 'clean'].includes(url.searchParams.get('intent') ?? '')) url.searchParams.delete('intent');
    url.searchParams.set('report', report.id);
    window.history[selectedReport ? 'replaceState' : 'pushState']({ ...window.history.state, litterbugsReportNavigation: true }, '', `${url.pathname}${url.search}${url.hash}`);
  }

  useEffect(() => {
    openMapReportRef.current = id => {
      const report = visibleReports.find(item => item.id === id)
        ?? (closestPreview?.report.id === id ? closestPreview.report : undefined)
        ?? (mapFirstEntry && selectedReport?.id === id && hasReportCoordinates(selectedReport) ? selectedReport : undefined);
      if (report) openReport(report, 'map_pin');
    };
  });

  async function openReportById(reportId: string) {
    const report = reports.find(({ id }) => id === reportId);
    if (report) { openReport(report, 'account'); return; }
    setToast('Loading report…');
    try {
      const { data, error } = await createClient().from('reports').select('*').eq('id', reportId).eq('is_published', true).eq('is_sample', false).maybeSingle();
      if (error || !data || !hasReportCoordinates(data)) throw new Error();
      setToast(''); openReport(data, 'account');
    } catch { setToast('This report could not be opened. Try again from your activity.'); }
  }

  function closeReport() {
    if (mapFirstEntry) { setDetailsMinimized(true); setReportListOpen(false); return; }
    const returnTo = new URL(window.location.href).searchParams.get('returnTo') ?? returnToCommunity;
    if (communityReturnPath(returnTo)) { window.location.assign(returnTo!); return; }
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
      if (['fund', 'clean'].includes(url.searchParams.get('intent') ?? '')) url.searchParams.delete('intent');
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
    trackWebsiteOutcome('report_published', report.id);
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
    if (hasReportCoordinates(report) && !prefersReducedMotion()) setJustPostedReport(report);
    setToast(REPORT_POSTED_TOAST);
    setPostedToast(REPORT_POSTED_TOAST);
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
      accountActionRef.current?.openAuth('report');
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
        if (!editingReport) trackParticipationFailure('report', 'review', 'photo_upload_failed');
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
        catch (error) { trackParticipationFailure('report', 'review', reportLocationFailureReason(error)); return error instanceof Error ? error.message : 'Your current location is required.'; }
        try { await saveReportPublication(pending); }
        catch { trackParticipationFailure('report', 'review', 'draft_save_failed'); return 'Your browser could not save the submission recovery record. Please try again.'; }
        const { data: retriedReport, error: retryError } = await supabase.rpc('publish_report', {
          target_report_id: pending.reportId,
          target_photo_paths: pending.paths,
          current_latitude: origin.latitude,
          current_longitude: origin.longitude,
          location_captured_at: origin.capturedAt,
        });
        if (retryError) { trackParticipationFailure('report', 'review', 'publication_unconfirmed'); return 'Your report has not been confirmed yet. Check your connection and try again.'; }
        await finishPublication(retriedReport, startingContributionCents);
        return null;
      }
      await clearReportPublication(authenticatedUserId);
      pendingPublication.current = null;
      setPublicationUncertain(false);
    }
    if (!draft.photos.length) return 'Add at least one clear photo before saving this report.';
    try { await requireReportLocation(draftCoordinates); }
    catch (error) { trackParticipationFailure('report', 'review', reportLocationFailureReason(error)); return error instanceof Error ? error.message : 'Your current location is required to post.'; }
    let reportId: string;
    try { reportId = await cloudDrafts.begin(authenticatedUserId, 'report'); }
    catch(error) { trackParticipationFailure('report', 'review', 'draft_save_failed'); return error instanceof Error ? error.message : 'Your draft must sync before submission. Please try again.'; }
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
    if (createError) { trackParticipationFailure('report', 'review', 'publication_unconfirmed'); return `Save failed: ${createError.message}`; }

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
      trackParticipationFailure('report', 'review', reportLocationFailureReason(error));
      await supabase.storage.from('report_photos').remove(uploaded.paths);
      return error instanceof Error ? error.message : 'Your current location is required to post.';
    }
    pendingPublication.current = { userId: authenticatedUserId, reportId, paths: uploaded.paths };
    setPublicationUncertain(true);
    try { await saveReportPublication(pendingPublication.current); }
    catch {
      trackParticipationFailure('report', 'review', 'draft_save_failed');
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
      trackParticipationFailure('report', 'review', 'publication_unconfirmed');
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
    // Confirmed on the page in the report sheet (DeleteReportConfirm), not with a browser pop-up.
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
    setClosestPreview(current => current?.report.id === selectedReport.id ? null : current);
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

  const hasDesktopReportPane = desktopDetail && Boolean(selectedReport) && !detailsMinimized;
  const excludeReportId = hasDesktopReportPane ? selectedReport?.id : undefined;
  const mapEmptyResponse = hasDesktopReportPane ? currentResponse : displayResponse;
  const closestAction = mapReady && !mapError && discoverySearch?.area ? <ClosestReportsAction
    key={JSON.stringify([discoverySearch.area, discoverySearch.filters, [...searchFavorites], [...reportPreferences.hidden], excludeReportId])}
    radius={discoveryFilters.radius}
    find={signal => findClosestReport(createClient(), { center: discoverySearch.area!, filters: discoverySearch.filters,
      favorites: searchFavorites, hidden: reportPreferences.hidden, signal, excludeReportId })}
    onShow={showClosestReport}
  /> : null;
  const hasDiscoveryFilters = Object.entries(discoveryFilters).some(([key, value]) => value !== DEFAULT_DISCOVERY_FILTERS[key as keyof DiscoveryFilters]);

  const viewToggle = (
    <div className="discovery-view-toggle" role="group" aria-label="Browse reports">
      <button type="button" aria-controls="active-report-list" aria-pressed={reportListOpen} onClick={() => switchDiscoveryView('reports')}><IoGridOutline aria-hidden /><span>Reports</span></button>
      <button type="button" aria-controls="report-map" aria-pressed={!reportListOpen} onClick={() => switchDiscoveryView('map')}><IoMapOutline aria-hidden /><span>Map</span></button>
    </div>
  );

  return (
    <main className={`map-page website-experience${!viewRestored && !requestedView ? ' discovery-default-view' : ''}${reportListOpen ? ' showing-reports' : ''}`}>
      <PublicSiteHeader activePath="/map" compactMobile mobileMapControls={viewToggle} reportId={selectedReport?.id} action={(
        <PublicAccountAction ref={accountActionRef} initialUserId={initialUserId} compactOnMobile
          onAccountDataChanged={refreshReports} onOpenReport={openReportById} onUserChange={handleUserChange}
          onResumeDraft={() => { void toggleReportMode(); }} />
      )} />
      <div className="discovery-toolbar">
        <PlaceSearch selected={searchPlace} onSelect={selectSearchPlace} onClear={clearSearchPlace} bias={discoveryArea} disabled={checkingLocation} />
        <div className="discovery-quick-filters" ref={setFilterToolbar} />
        <div className="discovery-toolbar-actions">
          <button className="secondary-button discovery-filters" onClick={() => { switchDiscoveryView('reports'); setFiltersRequest(value => value + 1); }}><IoOptionsOutline aria-hidden />Filters<span className="discovery-filter-count" data-empty={Object.entries(discoveryFilters).every(([key, value]) => value === DEFAULT_DISCOVERY_FILTERS[key as keyof DiscoveryFilters]) || undefined}>{Object.entries(discoveryFilters).filter(([key, value]) => value !== DEFAULT_DISCOVERY_FILTERS[key as keyof DiscoveryFilters]).length || ''}</span></button>
          {viewToggle}
        </div>
      </div>

      {toast && toast === postedToast
        ? <CelebrationToast title="Report posted">Thanks for helping keep the community clean!</CelebrationToast>
        : (initialError || toast) && <div className="toast" role="status">{toast || 'Some reports could not be loaded. Try refreshing the results.'}</div>}
      <div className={`map-workspace${hasDesktopReportPane ? ' has-report-detail' : ''}`}>
        <ReportBrowser
          filterToolbar={filterToolbar}
          reports={displayResponse?.reports ?? EMPTY_MAP_REPORTS}
          resultFilters={displayResponse?.search.filters ?? null}
          filtersRequest={filtersRequest}
          emptyPlaceSearch={<PlaceSearch trackingSurface="empty_search" label="Search another location" selected={null} onSelect={selectSearchPlace} onClear={clearSearchPlace} bias={discoveryArea} disabled={checkingLocation} />}
          closestAction={closestAction}
          onRetry={() => void refreshReports()}
          showAuthors
          onMemberBlocked={() => { void refreshReports(); }}
          onFavoriteChange={(id, favorite) => updateReportPreference('favorites', id, favorite)}
          onHiddenChange={(id, hidden) => updateReportPreference('hidden', id, hidden)}
          mapCenter={displayResponse?.search.area ?? discoveryArea}
          navigationSearch={searchParams.toString()}
          onDiscoveryFiltersChange={updateDiscoveryFilters}
          loading={!displayResponse}
          refreshing={Boolean(displayResponse && !currentResponse)}
          truncated={discoveryTruncated}
          discoveryError={currentResponse?.error}
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
        <section id="report-map" aria-busy={!mapTilesReady && !mapError} data-map-key-scope className={`map-stage${reportMode ? ' map-stage-reporting' : ''}`} aria-label="Litterbugs report map">
          <div ref={mapElementRef} className="google-map" />
          <button type="button" className="map-report-button"
            onClick={() => { setReportListOpen(false); void toggleReportMode(); }}
            disabled={checkingDraft || checkingLocation} aria-busy={checkingDraft || checkingLocation}
            aria-label={selectingDraftLocation ? 'Keep location' : reportMode ? 'Cancel reporting' : 'Report Litter'}>
            {selectingDraftLocation ? <IoLocationOutline aria-hidden="true" /> : reportMode ? <IoCloseCircleOutline aria-hidden="true" /> : <span className="map-report-bug" aria-hidden="true" />}<span>{selectingDraftLocation ? 'Keep location' : reportMode ? 'Cancel' : 'Report Litter'}</span>
          </button>
          {!mapError && <div className={`map-loading map-loading-cover${mapTilesReady ? ' map-loading-complete' : ''}`} aria-hidden={mapTilesReady} role="status" aria-label="Loading map"><span className="sr-only">Loading map…</span></div>}
          {mapError && <div className="map-error"><Icon name="warning" /><strong>Map unavailable</strong><span>{mapError}</span></div>}
          {!reportListOpen && !reportMode && (!selectedReport || hasDesktopReportPane) && !closestPreview && mapTilesReady && !mapError && mapEmptyResponse && (currentResponse?.error || !mapEmptyResponse.reports.length) && <MapEmptyState
            error={currentResponse?.error} filtered={hasDiscoveryFilters} closestAction={closestAction}
            onRetry={() => void refreshReports()}
            onFilters={() => { switchDiscoveryView('reports'); setFiltersRequest(value => value + 1); }}
          />}

          {reportMode && <>
            <div className="report-placement-pin" aria-hidden="true"><Icon name="location" /></div>
            <section className="report-placement-confirm" aria-label="Choose report location">
              <button type="button" className="icon-button report-placement-close" aria-label={selectingDraftLocation ? 'Cancel location change' : 'Cancel reporting'} title="Close" onClick={cancelLocationSelection}><Icon name="close" /></button>
              <div className="report-placement-instructions">
                <h1>Where is the litter?</h1>
                {locationError ? <p role="alert">{locationError}</p>
                  : userId && <p>To publish, Litterbugs checks that you’re near the pin.</p>}
              </div>
              <button className="primary-button" aria-busy={checkingLocation} disabled={!mapReady || checkingLocation} onClick={() => void confirmReportLocation()}>{locationError ? 'Try again' : 'Use this location'}</button>
              {userId && <button type="button" className="report-placement-draft" disabled={!mapReady || checkingLocation} onClick={continueReportAsDraft}>Continue as draft</button>}
            </section>
          </>}
          {selectedReport && detailsMinimized && <button type="button" className="secondary-button map-report-summary" onClick={() => setDetailsMinimized(false)} aria-label={`Open report details: ${selectedReport.title || 'Litter report'}`}>
            <strong>{selectedReport.title || 'Litter report'}</strong><span>View report details</span>
          </button>}
          {mapKey.length > 0 && (
            <ul className="map-key" aria-label="Map key" data-map-key>
              {mapKey.map(([kind, count, many, one, short]) => (
                <li key={kind} data-kind={kind}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- tiny brand marks, like BrandBug. */}
                  <img src={MAP_KEY_BUGS[kind]} alt="" aria-hidden="true" width={18} height={18} />
                  <span><b>{count}</b>{' '}<span className="map-key-label">{count === 1 ? one : many}</span><span className="map-key-short" aria-hidden="true">{short}</span></span>
                </li>
              ))}
            </ul>
          )}
          <div className="map-action-controls">
            <button onClick={toggleMapType} aria-label={`Change map type. Current: ${MAP_TYPES[mapTypeIndex]}`} title="Change map type"><Icon name="layers" /></button>
            <button onClick={centerOnUser} disabled={locating} aria-label={locating ? 'Finding your location' : 'Center map on your location'} aria-busy={locating} title="My location">{locating ? locatingBug : <Icon name="location" />}</button>
          </div>


        </section>
        {selectedReport && !detailsMinimized && <ReportDetail closeLabel={communityReturn && !mapFirstEntry ? "Close report and return to community" : undefined} entryIntent={selectedReport.id === searchParams.get('report') ? entryIntent : null} inline={desktopDetail} key={selectedReport.id} report={selectedReport} userId={userId} isOwner={canManageReport(selectedReport, userId)} favorite={reportPreferences.favorites.has(selectedReport.id)} hidden={reportPreferences.hidden.has(selectedReport.id)} onFavoriteChange={(favorite) => updateReportPreference('favorites', selectedReport.id, favorite)} onHiddenChange={(hidden) => updateReportPreference('hidden', selectedReport.id, hidden)} onNotify={setToast} onRequireSignIn={(intent) => { const url = new URL(window.location.href); url.searchParams.set('report', selectedReport.id); if (intent) url.searchParams.set('intent', intent); window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`); accountActionRef.current?.openAuth(intent); }} onReportChanged={refreshReports} onClose={closeReport} onEdit={() => { void editSelectedReport(); }} onDelete={() => { void deleteSelectedReport(); }} />}
      </div>

      <PublicSiteFooter compact />


      {draftCoordinates && userId && <ResumableReportWizard submissionProgress={reportUploadProgress} key={userId} userId={userId} onCoordinatesChange={setDraftCoordinates} onRestorePublication={restorePublication} fundingEnabled={fundingEnabled} coordinates={draftCoordinates} selectingLocation={selectingDraftLocation} onChangeLocation={publicationUncertain ? undefined : changeDraftLocation} onClose={closeReportTask} onSubmit={saveReport} />}
      {clusterIds && <ClusterReports reports={visibleReports.filter(report => clusterIds.includes(report.id))} truncated={discoveryTruncated} onClose={() => setClusterIds(null)} onChoose={report => { setClusterIds(null); openReport(report, 'cluster'); }} />}
      {reportFunding && <FundingContributionAction key={reportFunding.report.id} report={reportFunding.report} userId={userId} initialAmountCents={reportFunding.amountCents} startOpen onDismiss={() => setReportFunding(null)} onChanged={refreshReports} onRefreshFunding={() => refreshFundingReview(reportFunding.report.id)} />}
      {editingReport && <ReportWizard submissionProgress={reportUploadProgress} initialDraft={editDraft} isEditing existingPhotoCount={editingReport.photo_paths?.length ?? 0} existingPhotoUrls={editPhotoUrls} onClose={() => { setEditingReport(null); setEditPhotoUrls([]); }} onSubmit={saveReport} />}
    </main>
  );
}
