// The rendering budget applies to matching reports, never to unfiltered source pages.
export async function collectReportMatches(fetchPage, accepts, { limit = 1000, pageSize = 500 } = {}) {
  const matches = [];
  for (let offset = 0; matches.length <= limit; offset += pageSize) {
    const page = await fetchPage(offset, pageSize);
    for (const report of page) if (accepts(report)) matches.push(report);
    if (page.length < pageSize) break;
  }
  return { reports: matches.slice(0, limit), truncated: matches.length > limit };
}
