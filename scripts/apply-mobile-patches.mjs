import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const mobilePatchTarget = join(
  repositoryRoot,
  'node_modules',
  '@react-native-google-signin',
  'google-signin',
  'package.json',
);
const patchPackageExecutable = join(
  repositoryRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'patch-package.cmd' : 'patch-package',
);

if (!existsSync(mobilePatchTarget)) {
  console.log('Skipping mobile patches: the mobile workspace is not installed.');
  process.exit(0);
}

if (!existsSync(patchPackageExecutable)) {
  console.error('Mobile dependencies are installed but patch-package is unavailable.');
  process.exit(1);
}

const result = spawnSync(patchPackageExecutable, [], {
  cwd: repositoryRoot,
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
