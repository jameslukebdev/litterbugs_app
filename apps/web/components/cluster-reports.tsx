'use client';
/* eslint-disable @next/next/no-img-element -- the map's status bugs, like BrandBug. */
import { useState } from 'react';
import { IoChevronForward } from 'react-icons/io5';
import type { MappableReport } from '@litterbugs/report-contract';
import { ModalShell } from '@/components/modal-shell';
import styles from './cluster-reports.module.css';

/** Same bugs and colours as the map pins and the report sheet. */
function clusterStatus(state: MappableReport['cleanup_state']) {
  if (state === 'completed') return { label: 'Cleanup completed', bug: '/brand/bugs/flower.png', tone: 'done' };
  if (['claimed', 'completion_submitted', 'changes_requested'].includes(state ?? '')) return { label: 'Cleanup in progress', bug: '/brand/ranks/caterpillar.svg', tone: 'busy' };
  return { label: 'Available to clean', bug: '/brand/bugs/ladybug.png', tone: 'open' };
}

export function ClusterReports({ reports, truncated, onClose, onChoose }: { reports: MappableReport[]; truncated: boolean; onClose: () => void; onChoose: (report: MappableReport) => void }) {
  const [limit, setLimit] = useState(50);
  return <ModalShell label="Reports at this location" onClose={onClose} className={`cluster-report-dialog ${styles.dialog}`}>
    <h2>{reports.length ? `${reports.length} reports at this spot` : 'Reports at this location'}</h2>
    {!reports.length && <p>These reports are no longer in the current results. Close this list to explore the map.</p>}
    {truncated && <p className={styles.note}>Counts include the loaded matches. Narrow your filters to find more reports.</p>}
    <ul className={styles.list}>{reports.slice(0, limit).map(report => {
      const status = clusterStatus(report.cleanup_state);
      return <li key={report.id}><button type="button" onClick={() => onChoose(report)}>
        <span className={styles.copy}><strong>{report.title || 'Litter report'}</strong>{' '}<span className={styles.status} data-tone={status.tone}><img src={status.bug} alt="" aria-hidden="true" width={16} height={16} />{status.label}</span></span>
        <IoChevronForward aria-hidden="true" />
      </button></li>;
    })}</ul>
    {limit < reports.length && <button type="button" className={`secondary-button ${styles.more}`} onClick={() => setLimit(value => value + 50)}>Show more reports ({limit} of {reports.length})</button>}
  </ModalShell>;
}
