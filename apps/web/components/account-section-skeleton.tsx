export function AccountSectionSkeleton({ section = 'activity' }: { section?: string }) {
  return <div className={`account-section-skeleton account-section-skeleton-${section}`} role="status" aria-label="Loading account section">
    <div className="account-skeleton-card" aria-hidden="true">
      <span className="account-skeleton account-skeleton-name" />
      <span className="account-skeleton account-skeleton-line" />
      <span className="account-skeleton account-skeleton-row" />
      <span className="account-skeleton account-skeleton-line" />
    </div>
    <div className="account-skeleton-card" aria-hidden="true">
      <span className="account-skeleton account-skeleton-name" />
      <span className="account-skeleton account-skeleton-row" />
    </div>
  </div>;
}
