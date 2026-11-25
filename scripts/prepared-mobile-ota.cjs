// Verify an already prepared update; default mode never contacts Expo.
// --publish is for use only after Grant explicitly approves this exact release.
const { readFileSync } = require('node:fs');
const { execFileSync, spawnSync } = require('node:child_process');
const { resolve, join } = require('node:path');
const { createHash } = require('node:crypto');

function main() {
  const args = process.argv.slice(2);
  const output = args[0] && resolve(args[0]);
  if (!output || args.slice(1).some(arg => arg !== '--publish')) throw new Error('Usage: node scripts/prepared-mobile-ota.cjs ARTIFACT_DIRECTORY [--publish]');
  const root = resolve(__dirname, '..');
  const mobile = join(root, 'apps/mobile');
  const metadata = JSON.parse(readFileSync(join(output, 'readiness.json')));
  if (metadata.status !== 'PREPARED_NOT_PUBLISHED' || metadata.runtime !== '2.1.1' || metadata.channel !== 'production' || metadata.project !== 'df0d0855-71d9-4943-b278-d1f083ab6b06') throw new Error('Unexpected prepared release target.');
  if (!metadata.platforms.includes('ios') || !metadata.platforms.includes('android')) throw new Error('Both platforms are required.');
  const paths = ['apps/mobile', 'packages/report-contract', 'package-lock.json', 'patches'];
  execFileSync('git', ['diff', '--exit-code', metadata.source, 'HEAD', '--', ...paths], { cwd: root, stdio: 'pipe' });
  execFileSync('git', ['diff', '--exit-code', 'HEAD', '--', ...paths], { cwd: root, stdio: 'pipe' });
  for (const file of metadata.files) {
    const hash = createHash('sha256').update(readFileSync(join(output, 'dist', file.path))).digest('hex');
    if (hash !== file.sha256) throw new Error(`Prepared artifact changed: ${file.path}`);
  }
  const profile = JSON.parse(readFileSync(join(mobile, 'eas.json'))).build.production;
  const message = metadata.message || 'Report funders, optional anonymous donations, payment name controls, and photo hearts';
  const commandArgs = ['--yes', 'eas-cli@27.1.0', 'update', '--skip-bundler', '--input-dir', join(output, 'dist'), '--channel', 'production', '--environment', 'production', '--platform', 'all', '--upload-source-maps', '--message', message, '--non-interactive', '--json'];
  const publish = args.includes('--publish');
  console.log(JSON.stringify({ mode: publish ? 'PUBLISH' : 'VERIFY_ONLY_NOT_PUBLISHED', source: metadata.source, runtime: metadata.runtime, platforms: metadata.platforms, filesVerified: metadata.files.length, command: 'npx', args: commandArgs }, null, 2));
  if (!publish) return;
  const env = { ...process.env, ...profile.env, EXPO_NO_DOTENV: '1', NODE_OPTIONS: '--max-old-space-size=3072' };
  for (const key of ['EAS_BUILD', 'EAS_BUILD_PROFILE', 'EAS_BUILD_PLATFORM']) delete env[key];
  const result = spawnSync('npx', commandArgs, { cwd: mobile, env, stdio: 'inherit' });
  if (result.error || result.status !== 0) throw result.error || new Error(`EAS publish failed: ${result.status}`);
}
try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
