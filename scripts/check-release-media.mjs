// Opt-in staging build check. Uses existing providers with a public fixture only;
// never touches accounts, report records, Storage, payments or notifications.
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

if (process.env.LITTERBUGS_RELEASE_MEDIA_CHECK === '1') {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const require = createRequire(new URL('../apps/web/package.json', import.meta.url));
  const { build } = require('esbuild');
  const dir = mkdtempSync(join(tmpdir(), 'litterbugs-media-check-'));
  try {
    const output = join(dir, 'probe.cjs');
    await build({
      stdin: {
        resolveDir: root,
        sourcefile: 'release-media-check.ts',
        loader: 'ts',
        contents: `
          import { readFileSync } from 'node:fs';
          import { requireCleanMalwareScan, requireAppropriatePhoto } from './apps/web/lib/media-security';
          import { requireGooglePhotoReview } from './apps/web/lib/photo-content-review';
          const bytes=readFileSync(${JSON.stringify(join(root, 'apps/web/public/dev-review-preview/site-history/before.jpg'))});
          (async()=>{
            for(const [name,check] of [
              ['malware',()=>requireCleanMalwareScan(bytes)],
              ['content',()=>requireAppropriatePhoto(bytes)],
              ['google',()=>requireGooglePhotoReview(bytes)]
            ]){
              try { await check(); console.log('Release media check:',name,'passed'); }
              catch(error){ console.error('Release media check:',name,'failed',error?.code??'transport_error'); process.exitCode=1; }
            }
          })();
        `,
      },
      outfile: output,
      bundle: true,
      platform: 'node',
      format: 'cjs',
      logLevel: 'silent',
      plugins: [{ name: 'server-probe-dependencies', setup(build) {
        build.onResolve({ filter: /^server-only$/ }, () => ({ path: 'server-only', namespace: 'probe' }));
        build.onLoad({ filter: /.*/, namespace: 'probe' }, () => ({ contents: '' }));
        build.onResolve({ filter: /^(sharp|heic-convert)$/ }, args => ({ path: require.resolve(args.path), external: true }));
      } }],
    });
    const result = spawnSync(process.execPath, [output], { env: process.env, stdio: 'inherit' });
    if (result.status !== 0) process.exitCode = 1;
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
