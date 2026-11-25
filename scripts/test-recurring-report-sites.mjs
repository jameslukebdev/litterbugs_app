// Creates and removes its own loopback-only PostgreSQL. No hosted credentials.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const bin = execFileSync('pg_config', ['--bindir'], { encoding:'utf8' }).trim();
const directory = mkdtempSync(join(tmpdir(),'litterbugs-recurring-db-'));
const listener = createServer();
await new Promise(done => listener.listen(0,'127.0.0.1',done));
const port = listener.address().port;
await new Promise(done => listener.close(done));
const run = (tool,args) => execFileSync(join(bin,tool),args,{cwd:root,stdio:'inherit'});
let running=false;
try {
 run('initdb',['-D',join(directory,'data'),'-A','trust','--no-locale','-E','UTF8']);
 run('pg_ctl',['-D',join(directory,'data'),'-l',join(directory,'postgres.log'),'-o',`-h 127.0.0.1 -p ${port} -k ${directory} -c shared_buffers=32MB`,'-w','start']);
 running=true;
 for(const path of ['supabase/tests/fixtures/recurring-report-sites-bootstrap.sql','supabase/migrations/20260923212909_require_current_report_location.sql','supabase/migrations/20261125013903_recurring_report_sites.sql','supabase/tests/recurring_report_sites.sql']) run('psql',['-h','127.0.0.1','-p',String(port),'-d','postgres','-v','ON_ERROR_STOP=1','-f',path]);
 console.log('Recurring report ownership, publication, duplicate, privacy and prior-finance checks passed locally.');
} finally {
 if(running)run('pg_ctl',['-D',join(directory,'data'),'-m','fast','-w','stop']);
 rmSync(directory,{recursive:true,force:true});
}
