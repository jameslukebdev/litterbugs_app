/** Read-only checks against the running website. Usage: node scripts/check-community-foundation.mjs [base URL] [expected canonical origin] */
import { JSDOM } from 'jsdom';
const base = new URL(process.argv[2] || 'http://127.0.0.1:3000');
const hub = '/communities/us/nc/boone';
const canonicalSite = new URL(process.argv[3] || (['127.0.0.1', 'localhost'].includes(base.hostname) ? 'http://localhost:3000' : 'https://litterbugs.app')).origin;
const checks = [];
function check(name, passed) { checks.push({ name, passed: Boolean(passed) }); }
async function read(path) {
  const response = await fetch(new URL(path, base), { redirect: 'manual', signal: AbortSignal.timeout(30000) });
  const html = await response.text();
  return { response, document: new JSDOM(html, { url: new URL(path, base).href }).window.document };
}
function reportIds(document, selector = 'main') {
  return [...new Set([...document.querySelectorAll(`${selector} a[href^="/reports/"]`)].map(a => a.getAttribute('href')))];
}
function pageContract(path, result, noindex = false) {
  const { response, document: doc } = result;
  check(`${path}: 200`, response.status === 200);
  check(`${path}: one H1 in initial HTML`, doc.querySelectorAll('main h1').length === 1);
  check(`${path}: canonical`, doc.querySelector('link[rel="canonical"]')?.href === `${canonicalSite}${path}`);
  check(`${path}: indexability`, /noindex/.test(doc.querySelector('meta[name="robots"]')?.content || '') === noindex);
}
try {
  const [directory, local, available, funding, completed] = await Promise.all([
    read('/communities'), read(hub), read(`${hub}/cleanups?status=available`), read(`${hub}/cleanups?status=fundable`), read(`${hub}/cleanups?status=completed`),
  ]);
  pageContract('/communities', directory);
  pageContract(hub, local);
  for (const [kind, result] of [['available', available], ['fundable', funding], ['completed', completed]]) pageContract(`${hub}/cleanups?status=${kind}`, result, true);
  const doc = local.document;
  check('Boone has only four local content sections', doc.querySelectorAll('main > section').length === 4);
  check('Boone has local help and geographic scope', doc.querySelectorAll('#groups article').length >= 5 && doc.querySelector('main').textContent.includes('28607'));
  check('Generic promotional sections removed', !/Support the platform|Offer practical help|Explore nearby/.test(doc.querySelector('main').textContent));
  check('Directory has no repeated participation/organization pitches', !directory.document.querySelector('#ways-to-help-heading, #organization-heading, #community-questions-heading, #networks-heading'));
  check('Local guidance and crawlable report links exist', doc.querySelectorAll('#local-guidance details').length > 0 && (reportIds(doc, '#cleanups').length > 0 || doc.querySelector('#cleanups').textContent.includes('No active Litterbugs reports here right now.')));
  check('Section links have real targets', [...doc.querySelectorAll('main a[href^="#"]')].every(a => doc.getElementById(a.hash.slice(1))));
  const breadcrumbs = [...doc.querySelectorAll('script[type="application/ld+json"]')].map(x => JSON.parse(x.textContent)).find(x => x['@type'] === 'BreadcrumbList');
  check('Breadcrumbs identify the canonical hub', breadcrumbs?.itemListElement?.at(-1)?.item === `${canonicalSite}${hub}`);
  check('Reporting retains community context', [...doc.querySelectorAll('main a[href^="/report?"]')].every(a => new URL(a.href).searchParams.get('community') === 'us-nc-boone'));
  const resultPath = reportIds(doc, '#results')[0];
  if (resultPath) {
    const result = await read(resultPath);
    pageContract(resultPath, result);
    check('Completed report points to local opportunities', Boolean(result.document.querySelector(`a[href="${hub}/cleanups?status=available"]`)));
    check('Completed report points back to community', Boolean(result.document.querySelector(`a[href="${hub}"]`)));
    check('Completion dates are visible in the hub', doc.querySelectorAll('#results time').length > 0);
  } else check('Real completed result available for verification', false);
  const next = available.document.querySelector('nav[aria-label="Cleanup listing pages"] a[href*="page=2"]')?.getAttribute('href');
  if (next) {
    const second = await read(next);
    check('Second local page loads', second.response.status === 200);
    const firstIds = reportIds(available.document);
    check('Local pagination does not repeat reports', reportIds(second.document).every(id => !firstIds.includes(id)));
  }
  const organizations = [...new Set([...doc.querySelectorAll('#groups h3 a')].map(a => a.getAttribute('href').split('#')[0]))];
  for (const path of organizations) {
    const result = await read(path);
    pageContract(path, result, true);
    check(`${path}: links back to served community`, Boolean(result.document.querySelector(`a[href="${hub}"]`)));
  }
  for (const [oldPath, target] of [['/locations', '/communities'], ['/locations/us-nc-boone', hub]]) {
    const { response } = await read(oldPath);
    check(`${oldPath}: permanent canonical redirect`, response.status === 308 && new URL(response.headers.get('location'), base).pathname === target);
  }
  const [sitemap, robots, invalid, unknown] = await Promise.all([
    read('/sitemap.xml'), fetch(new URL('/robots.txt', base)).then(r => r.text()), read(`${hub}/cleanups?page=0`), read('/communities/us/nc/unreviewed'),
  ]);
  const locations = [...sitemap.document.querySelectorAll('loc')].map(e => e.textContent);
  check('Sitemap lists the hub exactly once', locations.filter(url => url === `${canonicalSite}${hub}`).length === 1);
  check('Sitemap excludes utility variants, legacy routes, and unreviewed profiles', locations.every(url => !url.includes('/locations') && !url.includes('/organizations/') && !url.includes(`${hub}/cleanups`)));
  check('Robots references the canonical sitemap', robots.includes(`${canonicalSite}/sitemap.xml`));
  check('Malformed local pagination is 404', invalid.response.status === 404);
  check('Unreviewed places do not become city pages', unknown.response.status === 404);
  console.log(JSON.stringify({ base: base.origin, canonicalSite, checkedAt: new Date().toISOString(), passed: checks.filter(x => x.passed).length, failed: checks.filter(x => !x.passed).length, checks }, null, 2));
  if (checks.some(x => !x.passed)) process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({ error: error.message, completedChecks: checks }, null, 2));
  process.exitCode = 1;
}
