// Resolve together without making the first photo wait for its neighbours.
// Null slots preserve the relationship between a photo path and its URL.
export async function resolveReportPhotoUrls(paths, getUrl, onFirstReady = () => {}) {
  return Promise.all(paths.map(async (path, index) => {
    let url = null;
    try { url = await getUrl(path) || null; } catch { /* Each photo can retry independently. */ }
    if (index === 0) onFirstReady(url);
    return url;
  }));
}
