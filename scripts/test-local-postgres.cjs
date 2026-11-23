const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { randomUUID } = require('node:crypto');
const { setTimeout: delay } = require('node:timers/promises');

const name = `mateo-postgres-test-${randomUUID().slice(0, 8)}`;
const docker = (args, options = {}) => spawnSync('docker', args, { encoding: 'utf8', ...options });

async function main() {
  const started = docker([
    'run',
    '-d',
    '--rm',
    '--name',
    name,
    '-e',
    'POSTGRES_PASSWORD=local-test-only',
    'postgres:16',
  ]);
  if (started.status !== 0) throw new Error(started.stderr || 'Could not start local PostgreSQL');
  try {
    let ready = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      if (docker(['exec', name, 'pg_isready', '-U', 'postgres']).status === 0) {
        ready = true;
        break;
      }
      await delay(1000);
    }
    if (!ready) throw new Error('Local PostgreSQL did not become ready');
    for (const file of [
      'tests/local-postgres/reconciliation-setup.sql',
      'supabase/migrations/20261123010000_atomic_reconciliation.sql',
      'tests/local-postgres/reconciliation-check.sql',
    ]) {
      const result = docker(
        [
          'exec',
          '-i',
          name,
          'psql',
          '-X',
          '-v',
          'ON_ERROR_STOP=1',
          '-U',
          'postgres',
          '-d',
          'postgres',
        ],
        { input: readFileSync(file, 'utf8') },
      );
      if (result.status !== 0) throw new Error(`${file}: ${result.stderr || result.stdout}`);
    }
    console.log('Local PostgreSQL reconciliation checks passed.');
  } finally {
    docker(['stop', name]);
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
