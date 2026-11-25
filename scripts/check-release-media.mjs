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
              ['malware',fetchImpl=>requireCleanMalwareScan(bytes,'image/jpeg',{fetchImpl})],
              ['content',fetchImpl=>requireAppropriatePhoto(bytes,{fetchImpl})],
              ['google',fetchImpl=>requireGooglePhotoReview(bytes,{fetchImpl})]
            ]){
              for(let attempt=0;attempt<3;attempt++){
                let transient=false,delay=5000*(attempt+1);
                const fetchImpl=async(input,init)=>{
                  const started=Date.now();
                  try {
                    const response=await fetch(input,init);
                    transient=response.status===429||response.status>=500;
                    const retryAfter=Number(response.headers.get('retry-after'));
                    if(Number.isFinite(retryAfter)&&retryAfter>0)delay=Math.min(30000,Math.max(delay,retryAfter*1000));
                    console.log('Release provider response:',name,response.status,Date.now()-started+'ms');
                    return response;
                  }catch(error){transient=true;console.log('Release provider transport:',name,error?.name??'Error');throw error;}
                };
                try { await check(fetchImpl); console.log('Release media check:',name,'passed'); break; }
                catch(error){
                  if(transient&&attempt<2){console.log('Release media check:',name,'transient retry',attempt+1);await new Promise(resolve=>setTimeout(resolve,delay));continue;}
                  console.error('Release media check:',name,'failed',error?.code??'transport_error');process.exitCode=1;break;
                }
              }
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
