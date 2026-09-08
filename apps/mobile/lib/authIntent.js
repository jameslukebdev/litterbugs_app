export function authenticatedActionDestination({
  permanent,
  profileComplete,
  intent,
}) {
  if (!permanent || !profileComplete || !intent?.reportId) return null;
  if (intent.kind === 'fund')
    return {
      name: 'FundingContribution',
      params: { reportId: intent.reportId },
    };
  if (intent.kind === 'cleanup')
    return {
      name: 'App',
      params: { screen: 'Map', params: { reportId: intent.reportId } },
    };
  return null;
}
