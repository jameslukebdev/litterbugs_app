export function cleanupImpactFacts(submission) {
  const facts = [];
  const bagsRemoved = Number(submission?.bags_or_items_removed);
  const durationMinutes = Number(submission?.duration_minutes);

  if (
    submission?.bags_or_items_removed != null
    && Number.isInteger(bagsRemoved)
    && bagsRemoved >= 0
  ) {
    facts.push({
      icon: 'bag-handle-outline',
      label: `${bagsRemoved} ${bagsRemoved === 1 ? 'bag/item' : 'bags/items'} removed`,
    });
  }

  if (
    submission?.duration_minutes != null
    && Number.isInteger(durationMinutes)
    && durationMinutes > 0
  ) {
    facts.push({
      icon: 'time-outline',
      label: `${durationMinutes} ${durationMinutes === 1 ? 'minute' : 'minutes'} volunteered`,
    });
  }

  return facts;
}

export function formatCleanupDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Cleanup date unavailable';

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
