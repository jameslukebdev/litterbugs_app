'use client';

/* eslint-disable @next/next/no-img-element -- Signed Supabase URLs are short-lived runtime images. */

import type { Coordinates, MappableReport } from '@litterbugs/report-contract';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { DEFAULT_DISCOVERY_FILTERS, matchesDiscovery, type DiscoveryFilters } from '@/lib/report-discovery';
import type { BoundaryGeometry } from '@/lib/place-geography';
import { Icon } from '@/components/icon';
import { getReportCardPhotoUrl, getReportDetailPhotoUrl } from '@/lib/report-photo';

const formatUsd = (cents: number) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
}).format(cents / 100);

type ReportFilter = 'available' | 'rewarded' | 'volunteer' | 'claimed' | 'completed' | 'all' | 'favorites' | 'hidden' | 'custom';
type ReportSort = 'newest' | 'reward-high' | 'severity';

const FILTERS: { value: ReportFilter; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'rewarded', label: 'Rewarded' },
  { value: 'volunteer', label: 'Volunteer' },
  { value: 'claimed', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'all', label: 'All reports' },
];

const SEVERITY_ORDER: Record<string, number> = { high: 3, medium: 2, low: 1 };
const preloadedDetailPhotos = new Set<string>();
const EMPTY_REPORT_IDS = new Set<string>();

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
  return 'Open';
}

function rewardLabel(report: MappableReport) {
  if (report.cleanup_state === 'completed') return report.funded_amount_cents > 0 ? `${formatUsd(report.funded_amount_cents)} funded cleanup` : 'Volunteer cleanup completed';
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
  if (filter === 'all' || filter === 'favorites' || filter === 'hidden') next.status = 'all';
  if (filter === 'favorites' || filter === 'hidden') next.scope = filter;
  if (filter === 'completed') next.status = 'completed';
  if (filter === 'claimed') next.status = 'progress';
  if (filter === 'rewarded') next.funding = 'funded';
  if (filter === 'volunteer') next.funding = 'volunteer';
  return next;
}

function resultsHeading(count: number, filter: ReportFilter) {
  if (filter === 'favorites') return `${count} favorite report${count === 1 ? '' : 's'}`;
  if (filter === 'hidden') return `${count} hidden report${count === 1 ? '' : 's'}`;
  if (filter === 'all' || filter === 'custom') return `${count} litter report${count === 1 ? '' : 's'}`;
  if (filter === 'completed') return `${count} completed cleanup${count === 1 ? '' : 's'}`;
  if (filter === 'claimed') return `${count} cleanup${count === 1 ? '' : 's'} in progress`;
  return `${count} cleanup opportunit${count === 1 ? 'y' : 'ies'}`;
}

function reportDate(createdAt: string | null) {
  if (!createdAt) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(createdAt));
}

function reportTiming(report: MappableReport) {
  if (report.cleanup_state === 'completed') return 'Cleanup complete';
  if (report.expires_at) return `Ends ${reportDate(report.expires_at)}`;
  if (report.created_at) return `Reported ${reportDate(report.created_at)}`;
  return '';
}

function ReportThumbnail({ report, priority }: { report: MappableReport; priority: boolean }) {
  const photoPath = report.photo_paths?.[0];
  const src = photoPath ? getReportCardPhotoUrl(photoPath) : null;
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span className="report-result-photo report-result-photo-empty">
        <Icon name="image" />
        <span>{failed ? 'Photo unavailable' : 'No photo yet'}</span>
        <span className="report-result-workflow">{workflowStatus(report)}</span>
      </span>
    );
  }

  return (
    <span className="report-result-photo">
      <img
        src={src}
        alt=""
        decoding="async"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        onError={() => setFailed(true)}
      />
      <span className="report-result-workflow">{workflowStatus(report)}</span>
      {(report.photo_paths?.length ?? 0) > 1 && (
        <span className="report-result-photo-count">{report.photo_paths?.length} photos</span>
      )}
    </span>
  );
}

export function ReportBrowser({
  reports,
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
  onDiscoveryFiltersChange,
  loading = false,
  truncated = false,
  discoveryError = '',
}: {
  mapCenter?: Coordinates | null;
  placeSearch?: ReactNode;
  boundary?: BoundaryGeometry;
  onDiscoveryFiltersChange?: (filters: DiscoveryFilters) => void;
  loading?: boolean;
  truncated?: boolean;
  discoveryError?: string;
  reports: MappableReport[];
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
  const listRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<ReportFilter>('available');
  const [advanced, setAdvanced] = useState<DiscoveryFilters>(DEFAULT_DISCOVERY_FILTERS);
  const [sort, setSort] = useState<ReportSort>('newest');
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
  useEffect(() => { onDiscoveryFiltersChange?.(applied); }, [applied, onDiscoveryFiltersChange]);
  function updateFilter<K extends keyof DiscoveryFilters>(key: K, value: DiscoveryFilters[K]) {
    setAdvanced({ ...applied, [key]: value });
    setFilter('custom');
  }
  const visibleReports = useMemo(() => {
    const filtered = reports.filter((report) => matchesDiscovery(report, applied, mapCenter, favoriteReportIds, hiddenReportIds, boundary));
    return filtered.sort((left, right) => {
      if (sort === 'reward-high') return right.funded_amount_cents - left.funded_amount_cents;
      if (sort === 'severity') {
        return (SEVERITY_ORDER[(right.severity ?? '').toLowerCase()] ?? 0)
          - (SEVERITY_ORDER[(left.severity ?? '').toLowerCase()] ?? 0);
      }
      return new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime();
    });
  }, [applied, mapCenter, favoriteReportIds, hiddenReportIds, reports, sort, boundary]);

  useEffect(() => {
    onVisibleReportsChange?.(visibleReports);
  }, [onVisibleReportsChange, visibleReports]);

  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = 0;
  }, [filter, open, sort]);

  return (
    <>
      <button className="report-browser-toggle" onClick={onToggle} aria-expanded={open} aria-controls="active-report-list">
        {open ? 'Map' : `List (${visibleReports.length})`}
      </button>
      <aside id="active-report-list" className={`report-browser${open ? ' report-browser-open' : ''}`} aria-label="Active litter reports">
        <header className="report-browser-header">
          <div className="report-browser-heading-row">
            <div>
              <h1>{resultsHeading(visibleReports.length, activeFilter)}</h1>
              <p>{activeFilter === 'custom' ? 'Matching reports' : filters.find(({ value }) => value === activeFilter)?.label} near this map</p>
            </div>
            <label className="report-sort">
              <span className="sr-only">Sort cleanup opportunities</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as ReportSort)}>
                <option value="newest">Newest</option>
                <option value="reward-high">Highest reward</option>
                <option value="severity">Highest severity</option>
              </select>
            </label>
            <button className="icon-button report-browser-close" onClick={onToggle} aria-label="Close report list"><Icon name="close" /></button>
          </div>
          <div className="report-browser-filters" aria-label="Filter cleanup opportunities">
            {filters.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={activeFilter === value}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          {placeSearch}
          <details className="discovery-filter-details"><summary>Search and filters</summary>
            <div className="discovery-filter-fields">
              <label className="discovery-query">Search report titles and notes<input type="search" value={applied.query} onChange={event => updateFilter('query', event.target.value)} placeholder="Bottles, roadside…" /></label>
              <label>Cleanup status<select value={applied.status} onChange={event => updateFilter('status', event.target.value as DiscoveryFilters['status'])}><option value="all">All</option><option value="available">Available</option><option value="progress">In progress</option><option value="completed">Completed</option></select></label>
              <label>Reward<select value={applied.funding} onChange={event => updateFilter('funding', event.target.value as DiscoveryFilters['funding'])}><option value="all">Any reward</option><option value="funded">Funded</option><option value="volunteer">Volunteer</option></select></label>
              <label>Severity<select value={applied.severity} onChange={event => updateFilter('severity', event.target.value as DiscoveryFilters['severity'])}><option value="all">All</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
              <label>Distance from map center<select disabled={!mapCenter} value={applied.radius} onChange={event => updateFilter('radius', Number(event.target.value) as DiscoveryFilters['radius'])}><option value={0}>Any distance</option><option value={5}>5 miles</option><option value={25}>25 miles</option><option value={50}>50 miles</option></select></label>
              <label>Saved reports<select value={applied.scope} onChange={event => updateFilter('scope', event.target.value as DiscoveryFilters['scope'])}><option value="all">All visible reports</option><option value="favorites">Favorites only</option><option value="hidden">Hidden reports</option></select></label>
              <button className="secondary-button" onClick={() => setFilter('all')}>Reset filters</button>
            </div>
          </details>
          <p className="discovery-status" role="status">{discoveryError || (loading ? 'Searching this map area…' : truncated ? 'Showing up to 1,000 matches. Zoom in or narrow your filters to see more.' : '')}</p>
        </header>
        <div className="report-browser-list" ref={listRef} aria-busy={loading}>
          {visibleReports.length ? visibleReports.map((report, index) => {
            const severity = (report.severity ?? 'Medium').toLowerCase();
            const selected = report.id === selectedReportId;
            const previewed = report.id === previewedReportId;
            const funded = report.funded_amount_cents > 0;
            return (
              <button
                className={`report-result${selected ? ' report-result-selected' : ''}${previewed ? ' report-result-previewed' : ''}`}
                key={report.id}
                onClick={() => onSelect(report)}
                onPointerEnter={() => { preloadReportPhoto(report); onPreviewReport?.(report.id); }}
                onPointerLeave={() => onPreviewReport?.(null)}
                onFocus={() => { preloadReportPhoto(report); onPreviewReport?.(report.id); }}
                onBlur={() => onPreviewReport?.(null)}
                aria-current={selected ? 'true' : undefined}
              >
                <ReportThumbnail report={report} priority={index < 4} />
                <span className="report-result-copy">
                  <strong>{report.title || 'Litter report'}</strong>
                  <span className={`report-result-reward${funded ? ' report-result-reward-funded' : ' report-result-reward-volunteer'}`}>{rewardLabel(report)}</span>
                  <span className="report-result-summary">{reportSummary(report)}</span>
                  <span className="report-result-meta">
                    <span className={`report-result-severity severity-${severity}`}><i />{report.severity ?? 'Medium'} priority</span>
                    <span>{reportTiming(report)}</span>
                  </span>
                </span>
              </button>
            );
          }) : (
            <div className="report-browser-empty">
              <strong>No matching cleanup opportunities</strong>
              <span>Try another filter or check this map again later.</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
