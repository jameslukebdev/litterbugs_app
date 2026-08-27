'use client';

import type { MappableReport } from '@litterbugs/report-contract';

import { Icon } from '@/components/icon';

const formatUsd = (cents: number) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
}).format(cents / 100);

function reportStatus(report: MappableReport) {
  if (report.cleanup_state === 'completed') return 'Cleanup complete';
  if (report.cleanup_state === 'claimed') return 'Cleanup in progress';
  if (report.funded_amount_cents > 0) return `Cleaner gets ${formatUsd(report.funded_amount_cents)}`;
  return 'Available to clean';
}

export function ReportBrowser({
  reports,
  open,
  onToggle,
  onSelect,
}: {
  reports: MappableReport[];
  open: boolean;
  onToggle: () => void;
  onSelect: (report: MappableReport) => void;
}) {
  return (
    <>
      <button className="report-browser-toggle" onClick={onToggle} aria-expanded={open} aria-controls="active-report-list">
        {reports.length} active report{reports.length === 1 ? '' : 's'}
      </button>
      <aside id="active-report-list" className={`report-browser${open ? ' report-browser-open' : ''}`} aria-label="Active litter reports">
        <header className="report-browser-header">
          <div>
            <span className="eyebrow">NEARBY CLEANUP OPPORTUNITIES</span>
            <h2>Active reports</h2>
            <p>Select a report to see its photos and details.</p>
          </div>
          <button className="icon-button report-browser-close" onClick={onToggle} aria-label="Close report list"><Icon name="close" /></button>
        </header>
        <div className="report-browser-list">
          {reports.length ? reports.map((report) => {
            const severity = (report.severity ?? 'Medium').toLowerCase();
            return (
              <button className="report-result" key={report.id} onClick={() => onSelect(report)}>
                <span className={`report-result-severity severity-${severity}`}><i />{report.severity ?? 'Medium'}</span>
                <strong>{report.title || 'Litter Report'}</strong>
                <span className="report-result-status">{reportStatus(report)}</span>
                <span className="report-result-meta">
                  {report.created_at ? `Reported ${new Date(report.created_at).toLocaleDateString()}` : 'Active report'}
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
