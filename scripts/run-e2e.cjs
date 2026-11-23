const { spawnSync } = require('node:child_process');

// Next.js embeds public configuration during the build. Force simulation both
// at build and runtime so E2E cannot use a developer's configured backend.
const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: 'https://placeholder-url.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'placeholder-anon-key',
  VITE_SUPABASE_URL: 'https://placeholder-url.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'placeholder-anon-key',
  MATEO_E2E_NEXT: 'production',
};
for (const args of [
  ['run', 'build'],
  ['exec', '--', 'playwright', 'test', ...process.argv.slice(2)],
]) {
  const result = spawnSync('npm', args, {
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
