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

const SITE = 'https://litterbugs.app';
const CARD_PHOTO_PATH = /\.(?:heic|heif|jpe?g|png|webp)$/i;

// The website's small card copy of a public report photo (about 100 KB, served from
// its CDN) instead of the original upload (often 1–2 MB). Null when the site can't make one.
function websitePhotoUrl(path, variant) {
  if (!path || /^https?:\/\//i.test(path) || !CARD_PHOTO_PATH.test(String(path).split(/[?#]/, 1)[0])) return null;
  return `${SITE}/api/report-photo?path=${encodeURIComponent(path)}&variant=${variant}`;
}
export const reportCardPhotoUrl = (path) => websitePhotoUrl(path, 'card');
// The larger copy (up to 1600 px, about 350 KB) for the report details photos.
export const reportDetailPhotoUrl = (path) => websitePhotoUrl(path, 'detail');

// A cleaned report's after photo, resized by the website (640 px for cards, 1080 px for details).
export function reportAfterPhotoUrl(reportId, { width = 640, index = 0 } = {}) {
  if (!reportId) return null;
  return `${SITE}/reports/${encodeURIComponent(reportId)}/photo/after?width=${width === 1080 ? 1080 : 640}${index ? `&photo=${index}` : ''}`;
}
