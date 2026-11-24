// Local preparation only. This script never publishes an update or changes EAS.
const { spawnSync, execFileSync } = require('node:child_process');
const { readFileSync, writeFileSync, mkdirSync, readdirSync, lstatSync, realpathSync, unlinkSync, cpSync, existsSync, symlinkSync } = require('node:fs');
const { resolve, join, relative, dirname } = require('node:path');
const { createHash } = require('node:crypto');

async function main() {
  const root = resolve(__dirname, '..');
  const mobile = join(root, 'apps/mobile');
  // Metro cannot follow an entire app-level dependency directory symlink outside
  // its workspace. Stage those small installed dependencies locally, preserving
  // the shared checkout and leaving native versions/lockfiles unchanged.
  const mobileModules = join(mobile, 'node_modules');
  if (lstatSync(mobileModules).isSymbolicLink()) {
    const installedModules = realpathSync(mobileModules);
    unlinkSync(mobileModules);
    cpSync(installedModules, mobileModules, { recursive: true });
  }
  const contractLink = join(mobileModules, '@litterbugs/report-contract');
  if (!existsSync(contractLink)) {
    mkdirSync(dirname(contractLink), { recursive: true });
    symlinkSync(relative(dirname(contractLink), join(root, 'packages/report-contract')), contractLink, 'dir');
  }
  const output = process.argv[2];
  if (!output || !require('node:path').isAbsolute(output)) throw new Error('Provide an absolute artifact output directory.');
  const baseline = '4835975e5f444e6c7c669020e80b4074d812efab';
  const source = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const nativePaths = ['apps/mobile/app.json', 'apps/mobile/app.config.js', 'apps/mobile/eas.json', 'apps/mobile/package.json', 'apps/mobile/plugins', 'apps/mobile/firebase', 'apps/mobile/assets', 'package-lock.json', 'patches'];
  const changedNative = execFileSync('git', ['diff', '--name-only', baseline, 'HEAD', '--', ...nativePaths], { cwd: root, encoding: 'utf8' }).trim();
  if (changedNative) throw new Error(`Native surface changed from the approved app: ${changedNative}`);
  const profile = JSON.parse(readFileSync(join(mobile, 'eas.json'))).build.production;
  Object.assign(process.env, profile.env, { EXPO_NO_DOTENV: '1', NODE_ENV: 'production', NODE_OPTIONS: '--max-old-space-size=3072', CI: '1' });
  for (const key of ['EAS_BUILD', 'EAS_BUILD_PROFILE', 'EAS_BUILD_PLATFORM']) delete process.env[key];
  for (const name of ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY', 'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID', 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID', 'EXPO_PUBLIC_POSTHOG_KEY']) {
    if (!process.env[name]) throw new Error(`Missing production environment variable: ${name}`);
  }
  const { getConfig } = require('@expo/config');
  const { exp } = getConfig(mobile);
  if (exp.version !== '2.1.1' || exp.runtimeVersion.policy !== 'appVersion' || exp.extra.eas.projectId !== 'df0d0855-71d9-4943-b278-d1f083ab6b06') throw new Error('Unexpected app/runtime/project.');
  if (!exp.extra.analytics.enabled || exp.extra.analytics.environment !== 'production') throw new Error('Production analytics configuration missing.');
  if (exp.ios.bundleIdentifier !== 'com.litterbugs.app' || exp.android.package !== 'com.litterbugs.app') throw new Error('Unexpected package identifiers.');
  mkdirSync(output, { recursive: true });
  const rpc = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/rpc/cleanup_contributor_credits`, {
    method: 'POST', signal: AbortSignal.timeout(20000), headers: { apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ report_ids: ['c9de971b-9b18-4e63-8b2d-00bba1de799c', '16c6df5b-8a92-4f7f-a4cd-22935a6c9c37'] }),
  });
  if (!rpc.ok) throw new Error(`Production public credit RPC returned ${rpc.status}.`);
  const credit = await rpc.json();
  if (!Array.isArray(credit)) throw new Error('Unexpected public credit response.');
  // Record schema keys and counts only, never donor identities or billing details.
  const publicReader = { status: rpc.status, rows: credit.length, keys: credit[0] ? Object.keys(credit[0]) : [], donationKeys: credit.flatMap(row => row.donations || []).slice(0, 1).map(row => Object.keys(row)) };
  if (credit.some(row => row.donations && !Array.isArray(row.donations))) throw new Error('Unexpected donations schema.');
  const exportDir = join(output, 'dist');
  const result = spawnSync(process.execPath, [join(root, 'node_modules/expo/bin/cli'), 'export', '--platform', 'all', '--max-workers', '1', '--source-maps', '--dump-assetmap', '--output-dir', exportDir], { cwd: mobile, env: process.env, stdio: 'inherit' });
  if (result.error || result.status !== 0) throw result.error || new Error(`Expo export failed: ${result.status}`);
  const metadata = JSON.parse(readFileSync(join(exportDir, 'metadata.json')));
  if (!metadata.fileMetadata?.ios || !metadata.fileMetadata?.android) throw new Error('Missing platform export.');
  const files = [];
  function collect(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) collect(path);
      else files.push({ path: relative(exportDir, path), sha256: createHash('sha256').update(readFileSync(path)).digest('hex') });
    }
  }
  collect(exportDir);
  const readiness = {
    preparedAt: new Date().toISOString(), source, baseline, status: 'PREPARED_NOT_PUBLISHED', approvalRequired: true,
    project: exp.extra.eas.projectId, runtime: exp.version, channel: profile.channel, environment: profile.environment,
    platforms: ['ios', 'android'], nativeSurfaceUnchanged: true, productionAnalyticsEnabled: true,
    publicReader, exportMetadata: metadata, files,
    diagnostics: { posthogDebugIds: true, sourceMapsExported: true, posthogUploadCredentialsAvailableLocally: Boolean(process.env.POSTHOG_CLI_API_KEY && process.env.POSTHOG_CLI_PROJECT_ID) },
  };
  writeFileSync(join(output, 'readiness.json'), `${JSON.stringify(readiness, null, 2)}\n`);
  console.log(JSON.stringify({ status: readiness.status, runtime: readiness.runtime, platforms: readiness.platforms, files: files.length, publicReader, posthogUploadCredentialsAvailableLocally: readiness.diagnostics.posthogUploadCredentialsAvailableLocally }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
