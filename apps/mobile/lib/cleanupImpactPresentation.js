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
      value: String(bagsRemoved),
      caption: `${bagsRemoved === 1 ? 'bag/item' : 'bags/items'} removed`,
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
      value: String(weightPounds),
      caption: `${weightPounds === 1 ? 'pound' : 'pounds'} removed`,
      label: `${weightPounds} ${weightPounds === 1 ? 'pound' : 'pounds'} removed`,
    });
  }

  const minutes = Number(submission?.duration_minutes);
  if (submission?.duration_minutes != null && Number.isFinite(minutes) && minutes > 0) {
    const hours = formatCleanupHours(minutes);
    facts.push({
      icon: 'time-outline',
      value: hours,
      caption: `${hours === '1' ? 'hr' : 'hrs'} spent`,
      label: `${hours} ${hours === '1' ? 'hour' : 'hours'} spent`,
    });
  }

  return facts;
}

// Minutes as hours to one decimal: 90 -> "1.5", 60 -> "1", 5 -> "0.1".
export function formatCleanupHours(minutes) {
  return String(Math.max(0.1, Math.round((Number(minutes) / 60) * 10) / 10));
}

export function formatCleanupDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Cleanup date unavailable';

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
