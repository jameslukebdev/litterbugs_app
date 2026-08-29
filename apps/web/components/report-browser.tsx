'use client';

/* eslint-disable @next/next/no-img-element -- Signed Supabase URLs are short-lived runtime images. */

import type { MappableReport } from '@litterbugs/report-contract';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Icon } from '@/components/icon';
import { getReportCardPhotoUrl, getReportDetailPhotoUrl } from '@/lib/report-photo';

const formatUsd = (cents: number) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
}).format(cents / 100);

type ReportFilter = 'available' | 'rewarded' | 'volunteer' | 'claimed' | 'all' | 'favorites' | 'hidden';
type ReportSort = 'newest' | 'reward-high' | 'severity';

const FILTERS: { value: ReportFilter; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'rewarded', label: 'Rewarded' },
  { value: 'volunteer', label: 'Volunteer' },
  { value: 'claimed', label: 'In progress' },
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
  if (report.cleanup_state === 'claimed') return 'In progress';
  return 'Open';
}

function rewardLabel(report: MappableReport) {
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

function matchesFilter(
  report: MappableReport,
  filter: ReportFilter,
  favoriteReportIds: ReadonlySet<string>,
  hiddenReportIds: ReadonlySet<string>,
) {
  if (filter === 'hidden') return hiddenReportIds.has(report.id);
  if (hiddenReportIds.has(report.id)) return false;
  if (filter === 'favorites') return favoriteReportIds.has(report.id);
  if (filter === 'all') return true;
  if (filter === 'claimed') return report.cleanup_state === 'claimed';
  if (filter === 'rewarded') return report.cleanup_state === 'available' && report.funded_amount_cents > 0;
  if (filter === 'volunteer') return report.cleanup_state === 'available' && report.funded_amount_cents === 0;
  return report.cleanup_state === 'available';
}

function resultsHeading(count: number, filter: ReportFilter) {
  if (filter === 'favorites') return `${count} favorite report${count === 1 ? '' : 's'}`;
  if (filter === 'hidden') return `${count} hidden report${count === 1 ? '' : 's'}`;
  if (filter === 'all') return `${count} litter report${count === 1 ? '' : 's'}`;
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
}: {
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
  const visibleReports = useMemo(() => {
    const filtered = reports.filter((report) => matchesFilter(report, activeFilter, favoriteReportIds, hiddenReportIds));
    return filtered.sort((left, right) => {
      if (sort === 'reward-high') return right.funded_amount_cents - left.funded_amount_cents;
      if (sort === 'severity') {
        return (SEVERITY_ORDER[(right.severity ?? '').toLowerCase()] ?? 0)
          - (SEVERITY_ORDER[(left.severity ?? '').toLowerCase()] ?? 0);
      }
      return new Date(right.created_at ?? 0).getTime() - new Date(left.created_at ?? 0).getTime();
    });
  }, [activeFilter, favoriteReportIds, hiddenReportIds, reports, sort]);

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
              <p>{filters.find(({ value }) => value === activeFilter)?.label} near this map</p>
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
        </header>
        <div className="report-browser-list" ref={listRef}>
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
