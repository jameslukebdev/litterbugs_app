/** Page through geographic candidates, then paginate only visible, in-boundary models.
 * Withdrawals during hydration do not leave gaps or inflate hasMore.
 */
export async function collectCommunityPage<Row, Model>(
  fetchRows: (offset: number, size: number) => Promise<Row[]>,
  accepts: (row: Row) => boolean,
  load: (row: Row) => Promise<Model | null>,
  size: number,
  page: number,
  batchSize = 200,
) {
  const skip = (page - 1) * size;
  const needed = skip + size + 1;
  const matches: Model[] = [];
  for (let offset = 0; matches.length < needed; offset += batchSize) {
    const rows = await fetchRows(offset, batchSize);
    const candidates = rows.filter(accepts);
    for (let cursor = 0; cursor < candidates.length && matches.length < needed;) {
      const chunk = candidates.slice(cursor, cursor + Math.min(12, needed - matches.length));
      cursor += chunk.length;
      const models = await Promise.all(chunk.map(load));
      for (const model of models) if (model !== null) matches.push(model as Model);
    }
    if (rows.length < batchSize) break;
  }
  return { reports: matches.slice(skip, skip + size), hasMore: matches.length > skip + size };
}

export function communityFeedStateMatches(kind: 'history' | 'recent' | 'open' | 'available' | 'completed' | 'fundable', state: 'available' | 'in_progress' | 'completed' | 'expired', fundingEligible?: boolean) {
  if (kind === 'history') return state === 'expired';
  if (state === 'expired') return false;
  return kind === 'recent' || (kind === 'open' && state !== 'completed') || (kind === 'completed' ? state === 'completed' : state === 'available' && (kind !== 'fundable' || fundingEligible === true));
}
