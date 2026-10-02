'use client';
import { useState } from 'react';
import type { MappableReport } from '@litterbugs/report-contract';
import { ModalShell } from '@/components/modal-shell';

export function ClusterReports({ reports, truncated, onClose, onChoose }: { reports: MappableReport[]; truncated: boolean; onClose: () => void; onChoose: (report: MappableReport) => void }) {
  const [limit, setLimit] = useState(50);
  return <ModalShell label="Reports at this location" onClose={onClose} className="cluster-report-dialog">
    <h2>Reports at this location</h2>
    <p>{reports.length ? `${reports.length} matching reports are close together. Choose one to see its details.` : 'These reports are no longer in the current results. Close this list to explore the map.'}</p>
    {truncated && <p>Counts include the loaded matches. Narrow your filters to find more reports.</p>}
    <ul className="cluster-report-list">{reports.slice(0, limit).map(report => <li key={report.id}><button type="button" onClick={() => onChoose(report)}><strong>{report.title || 'Litter report'}</strong>{' '}<span>{report.cleanup_state === 'completed' ? 'Cleanup completed' : ['claimed', 'completion_submitted', 'changes_requested'].includes(report.cleanup_state ?? '') ? 'Cleanup in progress' : 'Available to clean'}</span></button></li>)}</ul>
    {limit < reports.length && <button type="button" className="secondary-button" onClick={() => setLimit(value => value + 50)}>Show more reports ({limit} of {reports.length})</button>}
  </ModalShell>;
}
