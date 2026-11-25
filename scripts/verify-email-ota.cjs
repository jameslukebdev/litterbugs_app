// Offline verification only. This helper never publishes, even when passed extra flags.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const scope = ['apps/mobile', 'packages/report-contract', 'package-lock.json', 'patches'];
function main() {
  if (process.argv.length !== 3 || !path.isAbsolute(process.argv[2])) throw Error('Usage: node scripts/verify-email-ota.cjs ABSOLUTE_ARTIFACT_DIRECTORY');
  const output = process.argv[2], metadata = JSON.parse(fs.readFileSync(path.join(output, 'readiness.json')));
  if (metadata.status !== 'PREPARED_NOT_PUBLISHED' || metadata.publicationAuthorized !== false || metadata.runtime !== '2.1.1' || metadata.channel !== 'production' || metadata.environment !== 'production' || metadata.project !== 'df0d0855-71d9-4943-b278-d1f083ab6b06' || !metadata.platforms.includes('ios') || !metadata.platforms.includes('android')) throw Error('Unexpected prepared target.');
  for (const base of [metadata.source, 'HEAD']) cp.execFileSync('git', ['diff', '--exit-code', base, ...(base === 'HEAD' ? [] : ['HEAD']), '--', ...scope], { cwd: root, stdio: 'pipe' });
  for (const file of metadata.files) {
    const absolute = path.resolve(output, 'dist', file.path);
    if (!absolute.startsWith(path.resolve(output, 'dist') + path.sep)) throw Error('Invalid artifact path.');
    if (crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex') !== file.sha256) throw Error('Prepared artifact changed: ' + file.path);
  }
  const args = ['--yes', 'eas-cli@27.1.0', 'update', '--skip-bundler', '--input-dir', path.join(output, 'dist'), '--channel', 'production', '--environment', 'production', '--platform', 'all', '--upload-source-maps', '--message', metadata.message, '--non-interactive', '--json'];
  const result = { mode: 'VERIFY_ONLY_NOT_PUBLISHED', source: metadata.source, previousPublishedCommit: metadata.previousPublishedCommit, previousPublishedGroup: metadata.previousPublishedGroup, runtime: metadata.runtime, platforms: metadata.platforms, filesVerified: metadata.files.length, publicationRequiresLaterAuthorization: true, futurePublicationCommand: { command: 'npx', args }, requiredPublicationWrapper: 'Run EAS env:exec production with scripts/prepared-mobile-ota.cjs ARTIFACT_DIRECTORY --publish only after explicit authorization; that helper applies the production profile and disables local dotenv.' };
  fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
}
try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
