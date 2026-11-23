const { execFileSync, spawnSync } = require('node:child_process');

let status;
try {
  status = JSON.parse(
    execFileSync('supabase', ['status', '-o', 'json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }),
  );
} catch {
  console.error('Local Supabase is not running; start it before running the integration tests.');
  process.exit(1);
}

const env = {
  ...process.env,
  RUN_SUPABASE_INTEGRATION: '1',
  SUPABASE_INTEGRATION_URL: status.API_URL,
  SUPABASE_INTEGRATION_ANON_KEY: status.ANON_KEY,
  SUPABASE_INTEGRATION_SERVICE_KEY: status.SERVICE_ROLE_KEY,
};
const result = spawnSync(
  process.execPath,
  [
    './node_modules/vitest/vitest.mjs',
    'run',
    'src/app/api/incomes/internal/route.integration.test.ts',
  ],
  { env, stdio: 'inherit' },
);
process.exit(result.status ?? 1);
