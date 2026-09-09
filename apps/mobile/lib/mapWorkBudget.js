export const MAP_REPORT_LIMIT = 1000;
export const PROJECTION_BATCH_SIZE = 40;
export const mapLimitMessage = truncated => truncated ? 'Showing up to 1,000 reports in this area. Zoom in to see more.' : null;
export async function projectMapPoints(markers, project, isCurrent = () => true) {
  const results = [];
  for (let offset = 0; offset < markers.length && isCurrent(); offset += PROJECTION_BATCH_SIZE) {
    const batch = await Promise.all(markers.slice(offset, offset + PROJECTION_BATCH_SIZE).map(async marker => {
      try {
        const point = await project(marker.coordinate);
        return Number.isFinite(point?.x) && Number.isFinite(point?.y) ? { id: marker.id, ...point } : null;
      } catch { return null; }
    }));
    if (!isCurrent()) return [];
    results.push(...batch.filter(Boolean));
  }
  return results;
}
