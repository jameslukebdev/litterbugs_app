'use client';

/* eslint-disable @next/next/no-img-element -- Signed Supabase URLs are short-lived runtime images. */

import type { MappableReport } from '@litterbugs/report-contract';
import { useEffect, useRef, useState } from 'react';

import { Icon } from '@/components/icon';
import { getWebCompatibleReportPhotoUrl } from '@/lib/report-photo';
import { createClient } from '@/lib/supabase/client';

const formatUsd = (cents: number) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
}).format(cents / 100);

function reportStatus(report: MappableReport) {
  if (report.cleanup_state === 'completed') return 'Cleaned';
  if (report.cleanup_state === 'claimed') return 'In progress';
  if (report.funded_amount_cents > 0) return `${formatUsd(report.funded_amount_cents)} reward`;
  return 'Open';
}

function reportDate(createdAt: string | null) {
  if (!createdAt) return '';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(createdAt));
}

function ReportThumbnail({ report }: { report: MappableReport }) {
  const photoPath = report.photo_paths?.[0];
  const compatibilityUrl = photoPath ? getWebCompatibleReportPhotoUrl(photoPath) : null;
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!photoPath || compatibilityUrl) return;

    void createClient().storage
      .from('report_photos')
      .createSignedUrl(photoPath, 60 * 60)
      .then(({ data, error }) => {
        if (!cancelled) {
          setSignedUrl(data?.signedUrl ?? null);
          setFailed(Boolean(error || !data?.signedUrl));
        }
      });

    return () => { cancelled = true; };
  }, [compatibilityUrl, photoPath]);

  if (!photoPath || failed) return null;
  const src = compatibilityUrl ?? signedUrl;

  return (
    <span className="report-result-photo">
      {src && <img src={src} alt="" onError={() => setFailed(true)} />}
    </span>
  );
}

export function ReportBrowser({
  reports,
  open,
  onToggle,
  onSelect,
  selectedReportId,
}: {
  reports: MappableReport[];
  open: boolean;
  onToggle: () => void;
  onSelect: (report: MappableReport) => void;
  selectedReportId?: string | null;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = 0;
  }, [open]);

  return (
    <>
      <button className="report-browser-toggle" onClick={onToggle} aria-expanded={open} aria-controls="active-report-list">
        {open ? 'Map' : `List (${reports.length})`}
      </button>
      <aside id="active-report-list" className={`report-browser${open ? ' report-browser-open' : ''}`} aria-label="Active litter reports">
        <header className="report-browser-header">
          <h1>{reports.length} cleanup opportunit{reports.length === 1 ? 'y' : 'ies'}</h1>
          <button className="icon-button report-browser-close" onClick={onToggle} aria-label="Close report list"><Icon name="close" /></button>
        </header>
        <div className="report-browser-list" ref={listRef}>
          {reports.length ? reports.map((report) => {
            const severity = (report.severity ?? 'Medium').toLowerCase();
            const selected = report.id === selectedReportId;
            const hasPhoto = Boolean(report.photo_paths?.[0]);
            return (
              <button
                className={`report-result${hasPhoto ? '' : ' report-result-no-photo'}${selected ? ' report-result-selected' : ''}`}
                key={report.id}
                onClick={() => onSelect(report)}
                aria-current={selected ? 'true' : undefined}
              >
                <ReportThumbnail report={report} />
                <span className="report-result-copy">
                  <strong>{report.title || 'Litter Report'}</strong>
                  <span className="report-result-status">{reportStatus(report)}</span>
                  <span className="report-result-meta"><span className={`report-result-severity severity-${severity}`}><i />{report.severity ?? 'Medium'}</span>{reportDate(report.created_at)}</span>
                </span>
              </button>
            );
          }) : (
            <div className="report-browser-empty">
              <strong>No active reports</strong>
              <span>New cleanup opportunities will appear here.</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
