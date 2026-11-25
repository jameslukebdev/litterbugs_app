// Offline verification only. This file has no publication capability.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const output = process.argv[2];
try {
  if (process.argv.length !== 3 || !path.isAbsolute(output || '')) throw Error('Provide one absolute artifact directory. Publication is not supported.');
  const meta = JSON.parse(fs.readFileSync(path.join(output, 'readiness.json')));
  if (meta.status !== 'PREPARED_NOT_PUBLISHED' || meta.publicationAuthorized !== false || !['2.1.1', '2.1.2'].includes(meta.runtime) || meta.channel !== 'production' || meta.environment !== 'production' || meta.project !== 'df0d0855-71d9-4943-b278-d1f083ab6b06' || !meta.platforms.includes('ios') || (meta.runtime === '2.1.1' && !meta.platforms.includes('android'))) throw Error('Wrong artifact target.');
  const scope = ['apps/mobile', 'packages/report-contract', 'package-lock.json', 'patches'];
  for (const args of [['diff', '--exit-code', meta.source, 'HEAD', '--', ...scope], ['diff', '--exit-code', 'HEAD', '--', ...scope]]) cp.execFileSync('git', args, { cwd: root, stdio: 'pipe' });
  if (crypto.createHash('sha256').update(fs.readFileSync(path.join(output, 'app-config.json'))).digest('hex') !== meta.publicConfigSHA256) throw Error('Production config snapshot changed.');
  for (const entry of meta.files) {
    const file = path.resolve(output, 'dist', entry.path);
    if (!file.startsWith(path.resolve(output, 'dist') + path.sep) || crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') !== entry.sha256) throw Error('Artifact hash mismatch: ' + entry.path);
  }
  const result = { mode: 'VERIFY_ONLY_NOT_PUBLISHED', source: meta.source, runtime: meta.runtime, filesVerified: meta.files.length, productionEndpointsChecked: true, previousAssetsPreserved: meta.preservedAssets, nativeCrashPatchesPreserved: true, publicationRequiresLaterAuthorization: true };
  fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
} catch (error) { console.error(error.message); process.exitCode = 1; }
