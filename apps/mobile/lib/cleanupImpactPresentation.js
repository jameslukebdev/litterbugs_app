export function cleanupImpactFacts(submission) {
  const facts = [];
  const bagsRemoved = Number(submission?.bags_or_items_removed);
  const weightPounds = Number(submission?.weight_pounds);

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
    submission?.weight_pounds != null
    && Number.isFinite(weightPounds)
    && weightPounds > 0
  ) {
    facts.push({
      icon: 'scale-outline',
      label: `${weightPounds} ${weightPounds === 1 ? 'pound' : 'pounds'} removed`,
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
