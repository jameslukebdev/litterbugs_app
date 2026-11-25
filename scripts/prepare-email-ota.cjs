// Local export only. Never publishes or changes an Expo channel.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const mobile = path.join(root, 'apps/mobile');
const previous = '88555786784d07cc5a1a5bf549bd09e23dd5f429';
const previousGroup = '22df191b-5980-40c9-9a09-ec76a43cb2bb';
const scope = ['apps/mobile', 'packages/report-contract', 'package-lock.json', 'patches'];
const allowed = [
  'apps/mobile/App.js', 'apps/mobile/ProfileScreen.js', 'apps/mobile/EmailPreferencesScreen.js',
  'apps/mobile/EmailPreferencesScreen.test.jsx', 'apps/mobile/lib/weeklyEmail.js',
  'apps/mobile/lib/weeklyEmail.test.js', 'apps/mobile/lib/analytics.js',
  'apps/mobile/lib/analyticsInstrumentation.test.js', 'packages/report-contract/src/index.ts',
  'packages/report-contract/src/database.types.ts', 'packages/report-contract/src/weekly-email.ts',
  'packages/report-contract/src/weekly-email.test.ts',
];
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
  const backend = [];
  for (const rpc of ['get_weekly_email_preferences', 'admin_weekly_email_recipients']) {
    const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/rpc/${rpc}`, { method: 'POST', headers: { apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(20000) });
    const body = await response.json();
    if (![401, 403].includes(response.status) || body.code !== '42501') throw Error(`Backend function missing or incorrectly exposed: ${rpc}`);
    backend.push({ rpc, anonymousStatus: response.status, permissionDenied: true });
  }
  const exported = cp.spawnSync(process.execPath, [path.join(root, 'node_modules/expo/bin/cli'), 'export', '--platform', 'all', '--max-workers', '1', '--source-maps', '--dump-assetmap', '--output-dir', dist], { cwd: mobile, env: process.env, stdio: 'inherit' });
  if (exported.error || exported.status !== 0) throw exported.error || Error('Production export failed.');
  const metadata = JSON.parse(fs.readFileSync(path.join(dist, 'metadata.json')));
  if (!metadata.fileMetadata.ios || !metadata.fileMetadata.android) throw Error('Missing platform.');
  const files = [];
  function collect(folder) { for (const entry of fs.readdirSync(folder, { withFileTypes: true })) { const file = path.join(folder, entry.name); if (entry.isDirectory()) collect(file); else files.push({ path: path.relative(dist, file), sha256: hash(fs.readFileSync(file)) }); } }
  collect(dist);
  const tree = revision => new Map(git(['ls-tree', '-r', revision, '--', ...scope]).split('\n').filter(Boolean).map(line => { const [info, file] = line.split('\t'); return [file, info]; }));
  const oldTree = tree(previous), newTree = tree(source);
  const unchangedFiles = [...oldTree].filter(([file, object]) => newTree.get(file) === object).map(([file]) => file);
  const readiness = { preparedAt: new Date().toISOString(), status: 'PREPARED_NOT_PUBLISHED', publicationAuthorized: false, source, previousPublishedCommit: previous, previousPublishedGroup: previousGroup, project: exp.extra.eas.projectId, runtime: exp.version, channel: 'production', environment: 'production', platforms: ['ios', 'android'], message: 'Email preferences in Settings with synchronized unsubscribe handling', nativeSurfaceUnchanged: true, productionAnalyticsEnabled: true, changedFiles: changed, unchangedFileCount: unchangedFiles.length, unchangedFiles, backend, exportMetadata: metadata, files };
  fs.writeFileSync(path.join(output, 'readiness.json'), JSON.stringify(readiness, null, 2) + '\n');
  console.log(JSON.stringify({ status: readiness.status, source, platforms: readiness.platforms, runtime: readiness.runtime, previousPublishedGroup: previousGroup, files: files.length, unchangedSourceFiles: unchangedFiles.length }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
