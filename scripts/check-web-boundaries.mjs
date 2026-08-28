import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const runtimeRoots = [
  'apps/web/app',
  'apps/web/components',
  'apps/web/lib',
  'apps/web/public',
];
const buildRoots = [
  'apps/web/.next/server',
  'apps/web/.next/static',
];
const textExtensions = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.mjs',
  '.svg',
  '.ts',
  '.tsx',
  '.txt',
]);

const wrongProjectRef = ['syvg', 'qzfb', 'hkcz', 'kwoz', 'vola'].join('');
const forbiddenEverywhere = [
  [wrongProjectRef, 'the archived Supabase project'],
  ['maplibre', 'MapLibre'],
  ['openfreemap', 'OpenFreeMap'],
  ['openmaptiles', 'OpenMapTiles'],
];
const forbiddenInProjectSource = [
  ...forbiddenEverywhere,
  ['google.maps.places', 'Google Places API'],
  ['places.googleapis.com', 'Google Places API'],
  ['service_role', 'a Supabase service-role credential'],
  ['supabase_secret', 'a Supabase secret key'],
  ['stripe_secret_key', 'a Stripe secret-key variable'],
  ['sk_live_', 'a live Stripe secret key'],
  ['sk_test_', 'a test Stripe secret key'],
];

function collectFiles(relativeRoot) {
  const absoluteRoot = join(repositoryRoot, relativeRoot);
  if (!existsSync(absoluteRoot)) return [];

  const files = [];
  const visit = (path) => {
    const stat = statSync(path);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(path)) visit(join(path, entry));
      return;
    }
    if (textExtensions.has(extname(path).toLowerCase())) files.push(path);
  };
  visit(absoluteRoot);
  return files;
}

const sourceFiles = [
  ...runtimeRoots.flatMap(collectFiles),
  join(repositoryRoot, 'apps/web/.env.example'),
  join(repositoryRoot, 'apps/web/package.json'),
].filter(existsSync);
const buildFiles = buildRoots.flatMap(collectFiles);
const files = [...sourceFiles, ...buildFiles];

const violations = [];
function inspect(path, patterns) {
  const content = readFileSync(path, 'utf8').toLowerCase();
  for (const [needle, label] of patterns) {
    if (content.includes(needle)) {
      violations.push(`${relative(repositoryRoot, path)} contains ${label}`);
    }
  }
}
for (const path of sourceFiles) inspect(path, forbiddenInProjectSource);
for (const path of buildFiles) inspect(path, forbiddenEverywhere);

const webPackage = JSON.parse(readFileSync(join(repositoryRoot, 'apps/web/package.json'), 'utf8'));
const dependencyNames = Object.keys({
  ...webPackage.dependencies,
  ...webPackage.devDependencies,
}).map((name) => name.toLowerCase());
const allowedStripeDependencies = new Set([
  '@stripe/react-stripe-js',
  '@stripe/stripe-js',
]);
for (const dependency of dependencyNames) {
  if (
    dependency.includes('maplibre')
    || (dependency.includes('stripe') && !allowedStripeDependencies.has(dependency))
  ) {
    violations.push(`apps/web/package.json contains forbidden dependency ${dependency}`);
  }
}

const envExample = readFileSync(join(repositoryRoot, 'apps/web/.env.example'), 'utf8');
if (!envExample.includes('https://mvaygkflcjswtwchflrk.supabase.co')) {
  violations.push('apps/web/.env.example does not pin the correct Supabase project');
}

if (violations.length) {
  console.error('Web replacement boundary check failed:');
  for (const violation of [...new Set(violations)]) console.error(`- ${violation}`);
  process.exit(1);
}

console.log(`WEB_BOUNDARIES_MATCH (${files.length} source/build files checked)`);
