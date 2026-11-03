import Link from 'next/link';

type ActivityTab = 'current' | 'history' | 'reports';
export function AccountActivityTabs({ activeTab = 'current', embedded = true, onChange }: { activeTab?: ActivityTab; embedded?: boolean; onChange?: (tab: ActivityTab) => void }) {
  return <div className="activity-tabs" role="navigation" aria-label="My activity">
    {(['current', 'history', 'reports'] as const).map(tab => {
      const label = tab === 'current' ? 'Current cleanups' : tab === 'history' ? 'Cleanup history' : 'My reports';
      return embedded ? <Link key={tab} href={tab === 'reports' ? '/account/reports' : `/account/activity${tab === 'history' ? '?view=history' : ''}`} aria-current={activeTab === tab ? 'page' : undefined}>{label}</Link> : <button key={tab} aria-pressed={activeTab === tab} onClick={() => onChange?.(tab)}>{label}</button>;
    })}
  </div>;
}
