export function isLocalContributionReview() {
  return process.env.NODE_ENV === 'development' && typeof window !== 'undefined'
    && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
}

export async function localContributionName(contributionId: string, shown?: boolean): Promise<boolean | undefined> {
  if (!isLocalContributionReview()) return undefined;
  const response = await fetch('/api/local/contributions/name', {
    method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contributionId, action: shown === undefined ? 'read' : 'save', ...(shown === undefined ? {} : { shown }) }),
  });
  const result = await response.json();
  if (!response.ok || typeof result.shown !== 'boolean') throw new Error('Couldn’t save your choice. Try again.');
  return result.shown;
}
