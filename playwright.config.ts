import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas E2E con Playwright.
 *
 * La app se levanta SIEMPRE en "Modo Simulación" (datos en localStorage, sin Supabase):
 * se sobreescriben las variables VITE_SUPABASE_* con los valores placeholder que
 * `isSupabaseConfigured()` reconoce como "no configurado". Las variables del proceso
 * tienen prioridad sobre cualquier archivo .env, así que estas pruebas nunca tocan
 * una base de datos real aunque exista un .env local.
 *
 * Se usa un puerto propio (no el 5173 de `npm run dev`) y nunca se reutiliza un servidor
 * existente, para no correr las pruebas contra un dev server conectado a Supabase.
 */
const PORT = 5180;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'es-VE',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      VITE_SUPABASE_URL: 'https://placeholder-url.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'placeholder-anon-key',
    },
  },
});
