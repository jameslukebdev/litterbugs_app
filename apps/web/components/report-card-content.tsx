import type { ReactNode } from 'react';

/** Shared presentation for map results and server-rendered public report cards. */
export function ReportCardContent({ photo, title, reward, funded, summary, severity, reporterName, timing }: {
  photo: ReactNode;
  title: string;
  reward: string;
  funded: boolean;
  summary: string;
  severity?: string;
  reporterName?: string;
  timing: ReactNode;
}) {
  return <>
    {photo}
    <span className="report-result-copy">
      <strong title={title}>{title}</strong>
      <span className={`report-result-reward${funded ? ' report-result-reward-funded' : ' report-result-reward-volunteer'}`}>{reward}</span>
      <span className="report-result-summary">{summary}</span>
      <span className="report-result-meta">
        {reporterName !== undefined ? <span className="report-result-reporter" title={`Reported by ${reporterName}`}>{reporterName}</span> : <span className={`report-result-severity severity-${severity?.toLowerCase()}`}><i />{severity}</span>}
        <span>{timing}</span>
      </span>
    </span>
  </>;
}
