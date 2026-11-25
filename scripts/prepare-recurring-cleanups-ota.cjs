// Local export only. Never publishes or changes an Expo channel.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const mobile = path.join(root, 'apps/mobile');
const previous = '3db81d5e582788635fe7067ea40f4c2e538dddda';
const previousGroup = '5c8ab976-b063-4497-b5be-d15045622988';
const scope = ['apps/mobile', 'packages/report-contract', 'package-lock.json', 'patches'];
const allowed = ['apps/mobile/MapScreen.js', 'apps/mobile/components/ReportDetailsLoading.test.jsx', 'apps/mobile/components/ReportDetailsSheet.jsx', 'apps/mobile/components/ReportWizardModal.jsx', 'apps/mobile/components/ReportWizardSteps.jsx', 'apps/mobile/components/ReportSiteActivity.jsx', 'apps/mobile/components/ReportSiteActivity.test.jsx', 'apps/mobile/lib/collectReportMatches.js', 'apps/mobile/lib/collectReportMatches.test.js', 'apps/mobile/lib/discoveryReports.js', 'apps/mobile/lib/reports.js', 'apps/mobile/lib/reportSites.js', 'apps/mobile/lib/reportSites.test.js', 'apps/mobile/lib/siteReportDraft.js', 'apps/mobile/lib/savedReportDraft.test.js', 'apps/mobile/lib/siteReportSubmission.js', 'apps/mobile/lib/siteReportSubmission.test.js', 'apps/mobile/qa/site-history.js', 'apps/mobile/qa/README.md'];
const native = ['apps/mobile/app.json', 'apps/mobile/app.config.js', 'apps/mobile/eas.json',
  'apps/mobile/package.json', 'apps/mobile/plugins', 'apps/mobile/firebase', 'apps/mobile/assets',
  'package-lock.json', 'patches'];
const git = args => cp.execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

async function main() {
  const output = process.argv[2];
  if (!output || !path.isAbsolute(output)) throw Error('Provide an absolute artifact directory.');
  const dist = path.join(output, 'dist');
  if (fs.existsSync(dist)) throw Error('Refusing to overwrite a prepared export.');
  const source = git(['rev-parse', 'HEAD']);
  if (git(['ls-files', '--others', '--exclude-standard', '--', ...scope])) throw Error('Untracked app source must be reviewed before preparation.');
  git(['diff', '--exit-code', 'HEAD', '--', ...scope]);
  git(['diff', '--exit-code', previous, 'HEAD', '--', ...native]);
  const changed = git(['diff', '--name-only', previous, 'HEAD', '--', ...scope]).split('\n').filter(Boolean);
  if (changed.some(file => !allowed.includes(file))) throw Error('Unexpected app changes: ' + changed.join(', '));
  const channel = JSON.parse(fs.readFileSync(path.join(output, 'channel-before.json'))).currentPage;
  const latest = channel.updateBranches.find(branch => branch.name === 'production')?.updateGroups[0];
  if (!latest || latest.length !== 2 || latest.some(update => update.group !== previousGroup || update.gitCommitHash !== previous || update.runtime.version !== '2.1.1')) throw Error('Published baseline changed. Reconcile before preparation.');
  const profile = JSON.parse(fs.readFileSync(path.join(mobile, 'eas.json'))).build.production;
  Object.assign(process.env, profile.env, { EXPO_NO_DOTENV: '1', NODE_ENV: 'production', CI: '1', NODE_OPTIONS: '--max-old-space-size=3072' });
  for (const key of ['EAS_BUILD', 'EAS_BUILD_PROFILE', 'EAS_BUILD_PLATFORM']) delete process.env[key];
  for (const key of ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY', 'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID', 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID', 'EXPO_PUBLIC_POSTHOG_KEY']) if (!process.env[key]) throw Error('Missing production variable: ' + key);
  if (new URL(process.env.EXPO_PUBLIC_SUPABASE_URL).hostname !== 'mvaygkflcjswtwchflrk.supabase.co') throw Error('Wrong backend.');
  const { exp } = require('@expo/config').getConfig(mobile);
  if (exp.version !== '2.1.1' || exp.runtimeVersion.policy !== 'appVersion' || exp.extra.eas.projectId !== 'df0d0855-71d9-4943-b278-d1f083ab6b06' || exp.ios.bundleIdentifier !== 'com.litterbugs.app' || exp.android.package !== 'com.litterbugs.app' || !exp.extra.analytics.enabled || exp.extra.analytics.environment !== 'production') throw Error('Unexpected production app configuration.');
  const publicSite = await fetch('https://litterbugs.app/api/report-sites/e930e42c-a238-4786-b0e5-dd0ce1e5b319', { signal: AbortSignal.timeout(20000) });
  const site = await publicSite.json();
  if (!publicSite.ok || site.local || !site.reports?.some(report => report.state === 'completed')) throw Error('Public site history is unavailable.');
  const backend = [{ publicSiteHistory: true, status: publicSite.status, databaseChanges: false }];
  const exported = cp.spawnSync(process.execPath, [path.join(root, 'node_modules/expo/bin/cli'), 'export', '--clear', '--platform', 'all', '--max-workers', '1', '--source-maps', '--dump-assetmap', '--output-dir', dist], { cwd: mobile, env: process.env, stdio: 'inherit' });
  if (exported.error || exported.status !== 0) throw exported.error || Error('Production export failed.');
  const metadata = JSON.parse(fs.readFileSync(path.join(dist, 'metadata.json')));
  if (!metadata.fileMetadata.ios || !metadata.fileMetadata.android) throw Error('Missing platform.');
  const files = [];
  function collect(folder) { for (const entry of fs.readdirSync(folder, { withFileTypes: true })) { const file = path.join(folder, entry.name); if (entry.isDirectory()) collect(file); else files.push({ path: path.relative(dist, file), sha256: hash(fs.readFileSync(file)) }); } }
  collect(dist);
  const tree = revision => new Map(git(['ls-tree', '-r', revision, '--', ...scope]).split('\n').filter(Boolean).map(line => { const [info, file] = line.split('\t'); return [file, info]; }));
  const oldTree = tree(previous), newTree = tree(source);
  const unchangedFiles = [...oldTree].filter(([file, object]) => newTree.get(file) === object).map(([file]) => file);
  const readiness = { preparedAt: new Date().toISOString(), status: 'PREPARED_NOT_PUBLISHED', publicationAuthorized: false, source, previousPublishedCommit: previous, previousPublishedGroup: previousGroup, project: exp.extra.eas.projectId, runtime: exp.version, channel: 'production', environment: 'production', platforms: ['ios', 'android'], message: 'Report returned litter with a shared site Timeline and preserved cleanup history', nativeSurfaceUnchanged: true, productionAnalyticsEnabled: true, changedFiles: changed, unchangedFileCount: unchangedFiles.length, unchangedFiles, backend, exportMetadata: metadata, files };
  fs.writeFileSync(path.join(output, 'readiness.json'), JSON.stringify(readiness, null, 2) + '\n');
  console.log(JSON.stringify({ status: readiness.status, source, platforms: readiness.platforms, runtime: readiness.runtime, previousPublishedGroup: previousGroup, files: files.length, unchangedSourceFiles: unchangedFiles.length }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
