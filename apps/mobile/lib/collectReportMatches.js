// The rendering budget applies to matching reports, never to unfiltered source pages.
export async function collectReportMatches(fetchPage, accepts, { limit = 1000, pageSize = 500, identity } = {}) {
  const matches = [];
  const seen = new Set();
  for (let offset = 0; matches.length <= limit; offset += pageSize) {
    const page = await fetchPage(offset, pageSize);
    for (const report of page) {
      if (identity) { const key = identity(report); if (seen.has(key)) continue; seen.add(key); }
      if (accepts(report)) matches.push(report);
    }
    if (page.length < pageSize) break;
  }
  return { reports: matches.slice(0, limit), truncated: matches.length > limit };
}
