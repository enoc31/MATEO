import { expect, type Locator, type Page } from '@playwright/test';

/** Roles disponibles en los botones de "Acceso rápido" del login en Modo Simulación. */
export type DemoRole = 'Admin ONG' | 'Coordinador' | 'Auditor' | 'SuperAdmin';

const DEMO_PROFILE_IDS: Record<DemoRole, string> = {
  'Admin ONG': 'user-administrador',
  Coordinador: 'user-coordinador',
  Auditor: 'user-auditor',
  SuperAdmin: 'user-super_admin',
};

/**
 * Deja la app lista para una prueba determinista en Modo Simulación:
 *
 * - Bloquea toda petición que no vaya al dev server local, así las pruebas nunca
 *   tocan Supabase ni otros servicios reales.
 * - Marca la tasa BCV como "ya sincronizada hoy" para que la app no consulte las APIs
 *   públicas de tasas y use las tasas semilla del Modo Simulación.
 * - Opcionalmente marca el modal de bienvenida (COSO) como visto para un rol.
 */
export async function prepareSimulatedApp(
  page: Page,
  options: { skipWelcomeFor?: DemoRole } = {},
): Promise<void> {
  await page.context().route('**/*', (route) => {
    const { hostname } = new URL(route.request().url());
    return hostname === 'localhost' || hostname === '127.0.0.1' ? route.continue() : route.abort();
  });

  const welcomeKey = options.skipWelcomeFor
    ? `has_seen_coso_${DEMO_PROFILE_IDS[options.skipWelcomeFor]}`
    : null;
  await page.addInitScript((key) => {
    // Misma clave y formato que src/utils/bcvSync.ts
    window.localStorage.setItem('bcv_last_sync_date', new Date().toISOString().split('T')[0]);
    if (key) window.localStorage.setItem(key, 'true');
  }, welcomeKey);
}

/** Inicia sesión con un rol demo desde la pantalla de login y espera el Panel de Aplicaciones. */
export async function loginAs(page: Page, role: DemoRole): Promise<void> {
  await page.goto('/login');
  await expect(page.getByText('DEMO LOCAL SIMULADO')).toBeVisible();
  await page.getByRole('button', { name: role, exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
}

/**
 * Devuelve el control (input/select/textarea) de un `.form-group` según el texto de su label.
 *
 * Los formularios actuales no asocian <label> con su control (no usan htmlFor/id),
 * así que `getByLabel` no funciona. Cuando se corrija la accesibilidad, reemplazar
 * los usos de este helper por `page.getByLabel(...)`.
 */
export function formField(page: Page, label: string | RegExp): Locator {
  return page
    .locator('.form-group')
    .filter({ has: page.locator('label', { hasText: label }) })
    .locator('input, select, textarea')
    .first();
}

/**
 * Ejecuta `action` y devuelve el mensaje del primer `alert()` que dispare.
 * Varias pantallas confirman las operaciones con `window.alert`.
 */
export async function acceptNextAlert(page: Page, action: () => Promise<void>): Promise<string> {
  // El handler se registra antes de la acción: un alert() abierto bloquea el clic
  // que lo disparó hasta que alguien lo acepta.
  const message = new Promise<string>((resolve, reject) => {
    page.once('dialog', (dialog) => {
      const text = dialog.message();
      dialog.accept().then(() => resolve(text), reject);
    });
  });
  await action();
  return message;
}
