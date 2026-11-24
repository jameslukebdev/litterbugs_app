// Disposable local PostgreSQL only. Never reads a hosted database URL or credentials.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const binary = execFileSync('pg_config', ['--bindir'], { encoding: 'utf8' }).trim();
const directory = mkdtempSync(join(tmpdir(), 'litterbugs-weekly-email-test-'));
const server = createServer();
await new Promise(done => server.listen(0, '127.0.0.1', done));
const port = server.address().port;
await new Promise(done => server.close(done));
const run = (tool, args) => execFileSync(join(binary, tool), args, { cwd: root, stdio: 'inherit' });
let started = false;
try {
  run('initdb', ['-D',join(directory,'data'),'-A','trust','--no-locale','-E','UTF8']);
  run('pg_ctl',['-D',join(directory,'data'),'-l',join(directory,'postgres.log'),'-o',`-h 127.0.0.1 -p ${port} -k ${directory} -c shared_buffers=32MB`,'-w','start']);
  started=true;
  for (const file of ['supabase/tests/fixtures/weekly-email-bootstrap.sql','supabase/migrations/20261124211058_weekly_email_preferences.sql','supabase/tests/weekly_email_preferences.sql']) {
    run('psql',['-h','127.0.0.1','-p',String(port),'-d','postgres','-v','ON_ERROR_STOP=1','-f',file]);
  }
  console.log('Weekly email database and role-isolation checks passed. No hosted database was contacted.');
} finally {
  if (started) run('pg_ctl',['-D',join(directory,'data'),'-m','fast','-w','stop']);
  rmSync(directory,{recursive:true,force:true});
}
