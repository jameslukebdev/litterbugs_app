'use client';

/* eslint-disable @next/next/no-img-element -- Signed Supabase URLs are short-lived runtime images. */

import { createPortal } from 'react-dom';
import NextImage from 'next/image';
import { ReportSortMenu } from './report-sort';
import controls from './report-controls.module.css';
import { BrandBug } from './brand-bug';
import { ReportCardContent } from './report-card-content';
import { reportWorkflowTone } from '@/lib/report-visibility';
import { getDistanceMiles, type Coordinates, type MappableReport } from '@litterbugs/report-contract';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { DEFAULT_DISCOVERY_FILTERS, matchesDiscovery, type DiscoveryFilters } from '@/lib/report-discovery';
import type { BoundaryGeometry } from '@/lib/place-geography';
import { readBrowserMemory, saveBrowserMemory, readBrowserUrl, browserUrl } from '@/lib/discovery-memory';
import { reportRewardCents } from '@/lib/cleanup-reward';
import { getBrowserLocation } from '@/lib/geolocation';
import { createClient } from '@/lib/supabase/client';
import { ReportAuthor, publicFields, type PublicProfile } from '@/components/report-author';
import { ModalShell } from '@/components/modal-shell';
import { Icon } from '@/components/icon';
import { getReportCardPhotoUrl, getReportDetailPhotoUrl, retryReportPhotoUrl } from '@/lib/report-photo';

const formatUsd = (cents: number) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
}).format(cents / 100);

type ReportFilter = 'available' | 'rewarded' | 'volunteer' | 'claimed' | 'completed' | 'all' | 'favorites' | 'hidden' | 'custom';
type ReportSort = 'closest' | 'newest' | 'reward-high' | 'severity';

const FILTERS: { value: ReportFilter; label: string }[] = [
  { value: 'all', label: 'All reports' },
  { value: 'available', label: 'Available' },
  { value: 'rewarded', label: 'Rewarded' },
  { value: 'volunteer', label: 'Volunteer' },
  { value: 'claimed', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
];

const SEVERITY_ORDER: Record<string, number> = { high: 3, medium: 2, low: 1 };
const preloadedDetailPhotos = new Set<string>();
const EMPTY_REPORT_IDS = new Set<string>();
const EMPTY_RESULTS: MappableReport[] = [];

function preloadReportPhoto(report: MappableReport) {
  const path = report.photo_paths?.[0];
  const src = path ? getReportDetailPhotoUrl(path) : null;
  if (!src || preloadedDetailPhotos.has(src)) return;
  preloadedDetailPhotos.add(src);
  const image = new Image();
  image.decoding = 'async';
  image.src = src;
}

function workflowStatus(report: MappableReport) {
  if (report.cleanup_state === 'completed') return 'Cleaned';
  if (['claimed', 'completion_submitted', 'changes_requested'].includes(report.cleanup_state ?? '')) return 'In progress';
  return 'Available';
}

function rewardLabel(report: MappableReport) {
  if (report.cleanup_state === 'completed') {
    const reward = reportRewardCents(report);
    return reward == null ? 'Cleanup completed' : reward > 0 ? `${formatUsd(reward)} funded cleanup` : 'Volunteer cleanup completed';
  }
  return report.funded_amount_cents > 0
    ? `${formatUsd(report.funded_amount_cents)} reward`
    : 'Volunteer cleanup';
}

function reportSummary(report: MappableReport) {
  const litterTypes = report.litter_types?.filter(Boolean) ?? [];
  const typeSummary = litterTypes.length > 2
    ? `${litterTypes.slice(0, 2).join(' · ')} +${litterTypes.length - 2}`
    : litterTypes.join(' · ');
  const safetyNote = report.notes_presets?.find(Boolean);

  return [typeSummary || report.types || 'General litter', safetyNote]
    .filter(Boolean)
    .join(' · ');
}

function quickFilters(filter: ReportFilter): DiscoveryFilters {
  const next = { ...DEFAULT_DISCOVERY_FILTERS };
  if (['available', 'rewarded', 'volunteer'].includes(filter)) next.status = 'available';
  if (filter === 'all' || filter === 'favorites' || filter === 'hidden') next.status = 'all';
  if (filter === 'favorites' || filter === 'hidden') next.scope = filter;
  if (filter === 'completed') next.status = 'completed';
  if (filter === 'claimed') next.status = 'progress';
  if (filter === 'rewarded') next.funding = 'funded';
  if (filter === 'volunteer') next.funding = 'volunteer';
  return next;
}

function reportTiming(report: MappableReport) {
  if (report.cleanup_state === 'completed') return 'Cleanup complete';
  if (!report.created_at) return '';
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(report.created_at)) / 60000));
  if (!Number.isFinite(minutes)) return '';
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function ReportThumbnail({ report, priority, retry, onError }: { report: MappableReport; priority: boolean; retry: number; onError: () => void }) {
  const photoPath = report.photo_paths?.[0];
  const beforeSrc = photoPath ? getReportCardPhotoUrl(photoPath) : null;
  // Completed cleanups lead with the cleaned-up result; fall back to the original photo when there is no after photo.
  const [afterUnavailable, setAfterUnavailable] = useState(false);
  const showingAfter = report.cleanup_state === 'completed' && !afterUnavailable;
  const src = showingAfter ? `/reports/${encodeURIComponent(report.id)}/photo/after?width=640` : beforeSrc;
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!src || failed) {
    return (
      <span className="report-result-photo report-result-photo-empty">
        <Icon name="image" />
        <span>{failed ? 'Photo unavailable' : 'No photo yet'}</span>
        <span className="report-result-workflow" data-tone={reportWorkflowTone(report)}>{workflowStatus(report)}</span>
      </span>
    );
  }

  return (
    <span className="report-result-photo">
      <img
        className="report-card-image"
        data-loaded={loaded}
        onLoad={() => setLoaded(true)}
        src={showingAfter ? src : retryReportPhotoUrl(src, retry)}
        alt=""
        decoding="async"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        onError={() => { if (showingAfter) { setLoaded(false); setAfterUnavailable(true); return; } setFailed(true); onError(); }}
      />
      <span className="report-result-workflow" data-tone={reportWorkflowTone(report)}>{workflowStatus(report)}</span>
      {showingAfter && <span className="report-result-photo-count">After cleanup</span>}
      {!showingAfter && (report.photo_paths?.length ?? 0) > 1 && (
        <span className="report-result-photo-count">{report.photo_paths?.length} photos</span>
      )}
    </span>
  );
}

export function ReportBrowser({
  reports,
  onFavoriteChange,
  onHiddenChange,
  showAuthors = false,
  onMemberBlocked,
  open,
  onToggle,
  onSelect,
  selectedReportId,
  previewedReportId,
  onPreviewReport,
  onVisibleReportsChange,
  favoriteReportIds = EMPTY_REPORT_IDS,
  hiddenReportIds = EMPTY_REPORT_IDS,
  mapCenter,
  placeSearch,
  boundary,
  navigationSearch,
  onDiscoveryFiltersChange,
  resultFilters,
  loading = false,
  refreshing = false,
  truncated = false,
  discoveryError = '',
  filtersRequest = 0,
  filterToolbar,
  emptyPlaceSearch, onWidenArea, onRetry,
}: {
  filtersRequest?: number;
  filterToolbar?: HTMLElement | null;
  emptyPlaceSearch?: ReactNode;
  onWidenArea?: () => void;
  onRetry?: () => void;
  mapCenter?: Coordinates | null;
  placeSearch?: ReactNode;
  boundary?: BoundaryGeometry;
  navigationSearch?: string;
  onDiscoveryFiltersChange?: (filters: DiscoveryFilters) => void;
  resultFilters?: DiscoveryFilters | null;
  loading?: boolean;
  refreshing?: boolean;
  truncated?: boolean;
  discoveryError?: string;
  reports: MappableReport[];
  showAuthors?: boolean;
  onMemberBlocked?: () => void;
  onFavoriteChange?: (reportId: string, favorite: boolean) => void;
  onHiddenChange?: (reportId: string, hidden: boolean) => void;
  open: boolean;
  onToggle: () => void;
  onSelect: (report: MappableReport) => void;
  selectedReportId?: string | null;
  previewedReportId?: string | null;
  onPreviewReport?: (reportId: string | null) => void;
  onVisibleReportsChange?: (reports: MappableReport[]) => void;
  favoriteReportIds?: ReadonlySet<string>;
  hiddenReportIds?: ReadonlySet<string>;
}) {
  const [photoFailures, setPhotoFailures] = useState<Record<string, string>>({});
  const [photoRetries, setPhotoRetries] = useState<Record<string, number>>({});
  const [locationOrigin, setLocationOrigin] = useState<Coordinates | null>(null);
  const [locationMessage, setLocationMessage] = useState('');
  const [authors, setAuthors] = useState<Record<string, PublicProfile>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => {
    if (!filtersRequest) return;
    const timer = setTimeout(() => setFiltersOpen(true), 0);
    return () => clearTimeout(timer);
  }, [filtersRequest]);
  const listRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<ReportFilter>('all');
  const [draftFilters, setDraftFilters] = useState<DiscoveryFilters>(DEFAULT_DISCOVERY_FILTERS);
  const [advanced, setAdvanced] = useState<DiscoveryFilters>(DEFAULT_DISCOVERY_FILTERS);
  const [displayLimit, setDisplayLimit] = useState(50);
  const [sort, setSort] = useState<ReportSort>('newest');
  const [memoryReady, setMemoryReady] = useState(false);
  const restoringScrollRef = useRef<number | null>(null);
  const restoredBrowseUrl = useRef<string>(undefined);
  useEffect(() => {
    const restore = () => {
      setMemoryReady(true);
      const fromUrl = readBrowserUrl(window.location.search);
      // Next links can change the map's filters without remounting the browser.
      const signature = JSON.stringify(fromUrl);
      if (signature === restoredBrowseUrl.current) return;
      const initial = restoredBrowseUrl.current === undefined;
      restoredBrowseUrl.current = signature;
      const stored = readBrowserMemory();
      const sameSearch = stored && fromUrl && stored.sort === fromUrl.sort && (Object.keys(DEFAULT_DISCOVERY_FILTERS) as (keyof DiscoveryFilters)[]).every(key => stored.filters[key] === fromUrl.filters[key]);
      const memory = fromUrl ? { ...fromUrl, scroll: sameSearch ? stored.scroll : 0, displayLimit: sameSearch ? stored.displayLimit : 50 } : initial ? stored : null;
      if (memory) {
        setAdvanced(memory.filters); setDraftFilters(memory.filters); setFilter('custom'); setSort(memory.sort);
        restoringScrollRef.current = memory.scroll;
        setDisplayLimit(memory.displayLimit ?? 50);
        if (memory.sort === 'closest') void getBrowserLocation().then(setLocationOrigin).catch(() => setLocationMessage('Allow location access to sort by distance.'));
      }
    };
    const timer = setTimeout(restore, 0);
    window.addEventListener('popstate', restore);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('popstate', restore);
    };
  }, [navigationSearch]);
  const filters = useMemo(() => [
    ...FILTERS,
    ...(favoriteReportIds.size ? [{ value: 'favorites' as const, label: `Favorites (${favoriteReportIds.size})` }] : []),
    ...(hiddenReportIds.size ? [{ value: 'hidden' as const, label: `Hidden (${hiddenReportIds.size})` }] : []),
  ], [favoriteReportIds, hiddenReportIds]);
  const activeFilter = (filter === 'favorites' && !favoriteReportIds.size)
    || (filter === 'hidden' && !hiddenReportIds.size)
    ? 'available'
    : filter;
  const applied = useMemo(() => filter === 'custom' ? advanced : quickFilters(activeFilter), [filter, advanced, activeFilter]);
  const resultsLoading = loading || (resultFilters !== undefined && (!memoryReady || resultFilters !== applied));
  const selectedQuickFilter = filters.find(item => (Object.keys(DEFAULT_DISCOVERY_FILTERS) as (keyof DiscoveryFilters)[]).every(key => quickFilters(item.value)[key] === applied[key]))?.value;
  const hasFilters = selectedQuickFilter !== 'all';
  const rewardedOnly = applied.funding === 'funded';
  const canWiden = Boolean(onWidenArea || applied.radius);
  useEffect(() => { if (memoryReady) onDiscoveryFiltersChange?.(applied); }, [applied, onDiscoveryFiltersChange, memoryReady]);
  useEffect(() => {
    if (!memoryReady) return;
    saveBrowserMemory({ filters: applied, sort, scroll: restoringScrollRef.current ?? listRef.current?.scrollTop ?? 0, displayLimit });
  }, [applied, sort, memoryReady, displayLimit]);

  function writeBrowseUrl(filters: DiscoveryFilters, nextSort: ReportSort) {
    const current = new URL(window.location.href);
    const next = browserUrl(current, { filters, sort: nextSort, scroll: 0 });
    if (next !== `${current.pathname}${current.search}${current.hash}`) {
      restoredBrowseUrl.current = JSON.stringify(readBrowserUrl(new URL(next, current).search));
      window.history.replaceState(window.history.state, '', next);
    }
  }
  function updateFilter<K extends keyof DiscoveryFilters>(key: K, value: DiscoveryFilters[K]) {
    setDraftFilters(current => ({ ...current, [key]: value }));
  }

  function applyFilters(next: DiscoveryFilters, nextFilter: ReportFilter = 'custom') {
    writeBrowseUrl(next, sort);
    setAdvanced(next);
    setDraftFilters(next);
    setFilter(nextFilter);
    setDisplayLimit(50);
  }
  const visibleReports = useMemo(() => {
    if (resultsLoading) return EMPTY_RESULTS;
    const filtered = reports.filter((report) => matchesDiscovery(report, applied, mapCenter, favoriteReportIds, hiddenReportIds, boundary));
    return filtered.sort((left, right) => {
      if (sort === 'closest' && locationOrigin) return getDistanceMiles(locationOrigin, left) - getDistanceMiles(locationOrigin, right);
      if (sort === 'reward-high') return (reportRewardCents(right) ?? 0) - (reportRewardCents(left) ?? 0);
      if (sort === 'severity') {
        return (SEVERITY_ORDER[(right.severity ?? '').toLowerCase()] ?? 0)
          - (SEVERITY_ORDER[(left.severity ?? '').toLowerCase()] ?? 0);
      }
      return new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime();
    });
  }, [resultsLoading, applied, mapCenter, favoriteReportIds, hiddenReportIds, reports, sort, boundary, locationOrigin]);

  const displayedReports = useMemo(() => visibleReports.slice(0, displayLimit), [visibleReports, displayLimit]);
  useEffect(() => {
    if (!open || !showAuthors) return;
    let cancelled = false;
    const ids = [...new Set(displayedReports.map(report => report.user_id).filter((id): id is string => Boolean(id)))];
    if (!ids.length) return;
    async function loadAuthors() {
      const results: PublicProfile[] = [];
      for (let offset = 0; offset < ids.length; offset += 100) {
        const { data, error } = await createClient().from('profiles').select(publicFields).in('id', ids.slice(offset, offset + 100));
        if (cancelled) return;
        if (!error) results.push(...(data ?? []));
      }
      if (!cancelled) setAuthors(Object.fromEntries(results.map(profile => [profile.id, profile])));
    }
    void loadAuthors();
    return () => { cancelled = true; };
  }, [open, displayedReports, showAuthors]);

  useEffect(() => {
    onVisibleReportsChange?.(visibleReports);
  }, [onVisibleReportsChange, visibleReports]);

  useEffect(() => {
    if (listRef.current && restoringScrollRef.current === null) listRef.current.scrollTop = 0;
  }, [filter, sort]);

  useEffect(() => {
    if (memoryReady && !resultsLoading && reports.length && listRef.current && restoringScrollRef.current !== null) {
      listRef.current.scrollTop = restoringScrollRef.current; restoringScrollRef.current = null;
    }
  }, [memoryReady, resultsLoading, reports]);

  const filterPills = (<div className={`report-browser-filters ${filterToolbar ? controls.toolbarFilters : ''}`} aria-label="Filter cleanup opportunities">
            {!selectedQuickFilter && <button aria-pressed="true" onClick={() => { setDraftFilters(applied); setFiltersOpen(true); }}>Custom filters</button>}
            {filters.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={selectedQuickFilter === value}
                onClick={() => applyFilters(quickFilters(value), value)}
              >
                {label}
              </button>
            ))}
          </div>);

  return (
    <>
      <button className="report-browser-toggle" onClick={onToggle} aria-expanded={open} aria-controls="active-report-list">
        {open ? 'Map' : `List (${visibleReports.length})`}
      </button>
      <aside id="active-report-list" className={`${controls.panel} report-browser${open ? ' report-browser-open' : ''}`} aria-label="Active litter reports">
        <header className="report-browser-header">
          <div className="report-browser-heading-row">
            <div>
              <h1 className="reports-screen-title">Litter reports</h1>
            </div>
            <ReportSortMenu value={sort} options={[{ value: 'newest', label: 'Newest' }, { value: 'closest', label: 'Nearest' }, { value: 'reward-high', label: 'Top reward' }, { value: 'severity', label: 'Severity' }]} onChange={value => {
                const next = value as ReportSort; writeBrowseUrl(applied, next); setSort(next); setDisplayLimit(50);
                if (next === 'closest') { setLocationMessage('Finding your location…'); void getBrowserLocation().then(origin => { setLocationOrigin(origin); setLocationMessage(''); }).catch(() => { setLocationOrigin(null); setLocationMessage('Location unavailable. Showing newest first. Allow location access in your browser to sort by distance.'); }); }
              }} />
            <button className="icon-button report-browser-close" onClick={onToggle} aria-label="Close report list"><Icon name="close" /></button>
          </div>
          {filterToolbar ? createPortal(filterPills, filterToolbar) : filterPills}
          {placeSearch}
          <button className="secondary-button discovery-inline-filters" onClick={() => { setDraftFilters(applied); setFiltersOpen(true); }}>Search and filters</button>
          {filtersOpen && <ModalShell label="Search and filters" className="discovery-filter-dialog" onClose={() => { setDraftFilters(applied); setFiltersOpen(false); }}>{close => <><h2>Search and filters</h2>
            <div className="discovery-filter-fields">
              <label className="discovery-query">Search report titles and notes<input type="search" value={draftFilters.query} onChange={event => updateFilter('query', event.target.value)} placeholder="Bottles, roadside…" /></label>
              <label>Cleanup status<select value={draftFilters.status} onChange={event => updateFilter('status', event.target.value as DiscoveryFilters['status'])}><option value="all">All</option><option value="available">Available</option><option value="progress">In progress</option><option value="completed">Completed</option></select></label>
              <label>Reward<select value={draftFilters.funding} onChange={event => updateFilter('funding', event.target.value as DiscoveryFilters['funding'])}><option value="all">Any reward</option><option value="funded">Funded</option><option value="volunteer">Volunteer</option></select></label>
              <label>Severity<select value={draftFilters.severity} onChange={event => updateFilter('severity', event.target.value as DiscoveryFilters['severity'])}><option value="all">All</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
              <label>Distance from map center<select disabled={!mapCenter} value={draftFilters.radius} onChange={event => updateFilter('radius', Number(event.target.value) as DiscoveryFilters['radius'])}><option value={0}>Any distance</option><option value={5}>5 miles</option><option value={25}>25 miles</option><option value={50}>50 miles</option></select></label>
              <label>Saved reports<select value={draftFilters.scope} onChange={event => updateFilter('scope', event.target.value as DiscoveryFilters['scope'])}><option value="all">All visible reports</option><option value="favorites">Favorites only</option><option value="hidden">Hidden reports</option></select></label>
              <button className="secondary-button" onClick={() => { setDraftFilters(quickFilters('all')); }}>Reset filters</button>
              <div className="account-actions"><button className="secondary-button" onClick={close}>Cancel</button><button className="primary-button" onClick={() => { applyFilters(draftFilters); close(); }}>Apply filters</button></div>
            </div>
          </>}</ModalShell>}
          {sort === 'closest' && locationMessage && <p role="status">{locationMessage}</p>}
          <p className="discovery-status" role="status">{discoveryError || (truncated ? 'Showing up to 1,000 matches. Zoom in or narrow your filters to see more.' : '')}</p>
        </header>
        <div className={`report-browser-list${resultsLoading ? ` ${controls.loadingList}` : ''}`} ref={listRef} onScroll={() => { if (memoryReady && !resultsLoading) saveBrowserMemory({ filters: applied, sort, scroll: listRef.current?.scrollTop ?? 0, displayLimit }); }} aria-busy={resultsLoading || refreshing}>
          {visibleReports.length ? displayedReports.map((report, index) => {
            const selected = report.id === selectedReportId;
            const previewed = report.id === previewedReportId;
            const funded = (reportRewardCents(report) ?? 0) > 0;
            return (
              <article className="report-card-container" key={report.id}>
              <a
                href={`/reports/${encodeURIComponent(report.id)}`}
                className={`report-result${selected ? ' report-result-selected' : ''}${previewed ? ' report-result-previewed' : ''}`}
                key={report.id}
                onClick={event => {
                  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                  event.preventDefault();
                  onSelect(report);
                }}
                onPointerEnter={() => { preloadReportPhoto(report); onPreviewReport?.(report.id); }}
                onPointerLeave={() => onPreviewReport?.(null)}
                onFocus={() => { preloadReportPhoto(report); onPreviewReport?.(report.id); }}
                onBlur={() => onPreviewReport?.(null)}
                aria-current={selected ? 'true' : undefined}
              >
                <ReportCardContent
                  photo={<ReportThumbnail key={`${report.photo_paths?.[0]}:${photoRetries[report.id] ?? 0}`} report={report} priority={index < 4} retry={photoRetries[report.id] ?? 0} onError={() => setPhotoFailures(current => ({ ...current, [report.id]: report.photo_paths?.[0] ?? '' }))} />}
                  title={report.title || 'Litter report'}
                  reward={rewardLabel(report)} funded={funded}
                  summary={reportSummary(report)} severity={report.severity ?? 'Medium'}
                  timing={reportTiming(report)}
                />
              </a>
              {report.photo_paths?.[0] && photoFailures[report.id] === report.photo_paths[0] && <button className="secondary-button compact-button card-photo-retry" aria-label={`Retry photo for ${report.title || 'report'}`} onClick={() => {
                setPhotoFailures(current => ({ ...current, [report.id]: '' }));
                setPhotoRetries(current => ({ ...current, [report.id]: (current[report.id] ?? 0) + 1 }));
              }}>Retry photo</button>}
              {onFavoriteChange && <button className="card-favorite" aria-label={`${favoriteReportIds.has(report.id) ? 'Unfavorite' : 'Favorite'} ${report.title || 'report'}`} aria-pressed={favoriteReportIds.has(report.id)} onClick={() => onFavoriteChange(report.id, !favoriteReportIds.has(report.id))}><Icon name="heart" /></button>}
              {onHiddenChange && <details className="card-options"><summary aria-label={`Options for ${report.title || 'report'}`}>•••</summary><button onClick={() => onHiddenChange(report.id, !hiddenReportIds.has(report.id))}>{hiddenReportIds.has(report.id) ? 'Unhide report' : 'Hide report'}</button></details>}
              {showAuthors && report.user_id && (authors[report.user_id] ? <ReportAuthor key={report.user_id} profileId={report.user_id} initialProfile={authors[report.user_id]} sourceReportId={report.id} onBlocked={onMemberBlocked} /> : <div className="report-author report-author-placeholder" aria-hidden="true"><span className="report-author-initial" /><span className="report-author-copy"><span>Community member</span></span></div>)}
              </article>
            );
          }) : resultsLoading ? (
            <div role="status" aria-label="Loading reports">
              <BrandBug kind="bee" size={64} className={controls.loadingBee} />
            </div>
          ) : discoveryError ? (
            <div className="report-browser-empty">
              <BrandBug kind="ladybug" size={36} className="brand-bug-state" />
              <strong>Reports could not be loaded</strong>
              <span>Check your connection, then try again.</span>
              {onRetry && <button className="primary-button" onClick={onRetry}>Try again</button>}
            </div>
          ) : (
            <section className={controls.emptyPanel} aria-label="No results">
              <div className={controls.emptyIntro} role="status">
                <NextImage className={controls.emptyCaterpillar} src="/brand/ranks/caterpillar.svg" width={48} height={48} alt="" />
                <h2>{rewardedOnly ? 'No rewarded cleanups match your search' : hasFilters ? 'No reports match your filters' : 'No reports in this map area'}</h2>
              </div>
              {(rewardedOnly || canWiden) && <div className={controls.emptyActions}>
                {rewardedOnly && <button className="primary-button" onClick={() => applyFilters({ ...applied, funding: 'all' })}>Include volunteer cleanups</button>}
                {canWiden && <button className={`${controls.emptyWiden} ${rewardedOnly ? 'secondary-button' : 'primary-button'}`} onClick={() => {
                  if (applied.radius) applyFilters({ ...applied, radius: 0 });
                  onWidenArea?.();
                }}>Search a wider area</button>}
              </div>}
              {emptyPlaceSearch && <div className={controls.emptyPlaceSearch}>
                {canWiden && <div className={controls.emptyOr}>or</div>}
                {emptyPlaceSearch}
              </div>}
              {hasFilters && <button className={controls.emptyTextAction} onClick={() => applyFilters(quickFilters('all'), 'all')}>Clear filters</button>}
            </section>
          )}
          {displayedReports.length < visibleReports.length && <button className="secondary-button load-more-reports" onClick={() => setDisplayLimit(value => value + 50)}>Show more reports ({displayedReports.length} of {visibleReports.length})</button>}
        </div>
      </aside>
    </>
  );
}
