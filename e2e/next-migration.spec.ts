import { expect, test } from '@playwright/test';
import { loginAs, prepareSimulatedApp } from './support/app';

test.describe('Next.js migration contracts', () => {
  test('registration has server-rendered share metadata', async ({ request }) => {
    const response = await request.get('/registro', {
      headers: { 'user-agent': 'facebookexternalhit/1.1' },
    });
    expect(response.ok()).toBe(true);
    const html = await response.text();
    expect(html).toContain('Formulario de Registro Entrega de Donación');
    expect(html).toContain('property="og:title"');
  });

  test('registration opens the public workflow', async ({ page }) => {
    await page.goto('/registro');
    await expect(
      page.getByRole('heading', { name: 'Seleccionar Jornada de Ayuda Social' }),
    ).toBeVisible();
  });

  test('login preserves a recovery token when redirecting', async ({ page }) => {
    await page.goto('/login#type=recovery&access_token=test-token');
    await expect(page).toHaveURL(/\/update-password/);
    expect(new URL(page.url()).hash).toContain('access_token=test-token');
  });

  test('password recovery opens and submits in simulation mode', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByLabel('Correo Electrónico').fill('persona@example.org');
    await page.getByRole('button', { name: 'Enviar Enlace de Recuperación' }).click();
    await expect(
      page.getByText(/recibirás instrucciones para restablecer tu contraseña/),
    ).toBeVisible();
    await page.getByRole('link', { name: /Volver al Inicio de Sesión/ }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('password update validates mismatched passwords', async ({ page }) => {
    await page.goto('/update-password');
    await page.getByLabel(/^Nueva Contraseña/i).fill('password123');
    await page.getByLabel(/^Confirmar Contraseña/i).fill('password456');
    await page.getByRole('button', { name: /Guardar Nueva Contraseña/i }).click();
    await expect(page.getByText('Las contraseñas no coinciden.')).toBeVisible();
  });

  test('invitation page accepts a token', async ({ page }) => {
    await page.goto('/aceptar-invitacion');
    await expect(page.getByPlaceholder(/inv-abc123xyz/i)).toBeVisible();
  });

  test('registration aliases open the organization wizard', async ({ page }) => {
    await page.goto('/wizard');
    await expect(page).toHaveURL(/\/registro-ong/);
    await expect(page.getByText(/1\. Datos Fundamentales del Templo/i)).toBeVisible();
  });

  test('landing navigates to login', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Iniciar Sesión', exact: true }).first().click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText('DEMO LOCAL SIMULADO')).toBeVisible();
  });

  test('SaaS login remains available', async ({ page }) => {
    await page.goto('/saas-admin');
    await expect(page.getByRole('heading', { name: 'MATEO SaaS' })).toBeVisible();
    await page.getByRole('button', { name: 'Acceso Rápido: Super Administrador' }).click();
    await expect(page).toHaveURL(/\/saas-admin\/dashboard/);
    await page.getByRole('link', { name: 'ONGs e Iglesias' }).click();
    await expect(page).toHaveURL(/\/saas-admin\/ongs/);
  });

  test('SaaS workspace redirects unauthenticated users', async ({ page }) => {
    await page.goto('/saas-admin/users');
    await expect(page).toHaveURL(/\/saas-admin$/);
  });

  test('workspace home requires authentication', async ({ page }) => {
    await page.goto('/app');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('workspace dashboard preserves role access', async ({ page }) => {
    await prepareSimulatedApp(page, { skipWelcomeFor: 'Admin ONG' });
    await loginAs(page, 'Admin ONG');
    await page.goto('/app/dashboard');
    await expect(
      page.getByRole('heading', { name: 'Tablero Informativo en Tiempo Real' }),
    ).toBeVisible();
  });

  test('workspace dashboard denies a coordinator', async ({ page }) => {
    await prepareSimulatedApp(page, { skipWelcomeFor: 'Coordinador' });
    await loginAs(page, 'Coordinador');
    await page.goto('/app/dashboard');
    await expect(page.getByText('Acceso Denegado')).toBeVisible();
  });

  test('migrated workspace modules render for an administrator', async ({ page }) => {
    await prepareSimulatedApp(page, { skipWelcomeFor: 'Admin ONG' });
    await loginAs(page, 'Admin ONG');
    const routes: Array<[string, RegExp]> = [
      ['reconciliation', /Conciliación Bancaria/],
      ['field-entry', /Carga Rápida de Gastos/],
      ['miembros', /Seleccionar Jornada de Ayuda Social/],
      ['jornadas', /Actividades y Eventos Ministeriales/],
      ['requisitions', /Solicitudes de Gasto/],
      ['users', /Consola de Gestión de Usuarios/],
      ['tasas', /Administración de Tasas BCV/],
      ['catalog', /Catálogo de Partidas/],
      ['organization', /Perfil de la organización/i],
      ['audit', /Auditoría y Conformidad de Gastos/],
      ['incomes', /Registro de Diezmos y Ofrendas/],
      ['budgets', /Presupuestos Modelo UNDG/],
      ['finance', /Ingresos y Gastos/],
    ];
    for (const [path, title] of routes) {
      await page.goto(`/app/${path}`);
      await expect(page.getByRole('heading', { name: title }).first()).toBeVisible();
    }
  });

  test('unknown workspace paths retain authentication and the workspace fallback', async ({
    page,
  }) => {
    await page.goto('/app/unknown/nested');
    await expect(page).toHaveURL(/\/login$/);
    await prepareSimulatedApp(page, { skipWelcomeFor: 'Admin ONG' });
    await loginAs(page, 'Admin ONG');
    for (const path of ['/app/unknown', '/app/unknown/nested']) {
      await page.goto(path);
      await expect(page.getByText('Página no encontrada')).toBeVisible();
      await expect(page.getByRole('link', { name: /Tablero/i }).first()).toBeVisible();
    }
  });

  test('unknown public and SaaS paths preserve redirects', async ({ page }) => {
    await page.goto('/unrecognized/nested');
    await expect(page).toHaveURL(/\/$/);
    await page.goto('/saas-admin/unrecognized/nested');
    await expect(page).toHaveURL(/\/saas-admin$/);
  });

  test('project configuration preserves its role restrictions and back navigation', async ({
    page,
  }) => {
    await prepareSimulatedApp(page, { skipWelcomeFor: 'Admin ONG' });
    await loginAs(page, 'Admin ONG');
    await page.goto('/app/project-partidas/example-project');
    await expect(
      page.getByRole('heading', { name: 'Configurar Partidas del Proyecto' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Volver a Presupuestos' }).click();
    await expect(page).toHaveURL(/\/app\/budgets$/);
  });

  test('project configuration denies unauthorized roles', async ({ page }) => {
    await prepareSimulatedApp(page, { skipWelcomeFor: 'Coordinador' });
    await loginAs(page, 'Coordinador');
    await page.goto('/app/project-partidas/example-project');
    await expect(page.getByText('Acceso Denegado')).toBeVisible();
  });

  test('Next responses retain the deployment security headers', async ({ request }) => {
    const response = await request.get('/login');
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
    expect(response.headers()['x-frame-options']).toBe('DENY');
    expect(response.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(response.headers()['permissions-policy']).toBe(
      'camera=(self), microphone=(), geolocation=(self)',
    );
    expect(response.headers()['strict-transport-security']).toBe(
      'max-age=63072000; includeSubDomains; preload',
    );
  });

  test('telemetry preflight retains the public endpoint', async ({ request }) => {
    const response = await request.fetch('/api/otlp/v1/traces', { method: 'OPTIONS' });
    expect(response.status()).toBe(200);
    expect(response.headers()['access-control-allow-methods']).toBe('POST, OPTIONS');
  });

  test('registration endpoint retains its share-preview response', async ({ request }) => {
    const response = await request.get('/api/registro', {
      headers: { 'user-agent': 'facebookexternalhit/1.1' },
    });
    expect(response.ok()).toBe(true);
    expect(await response.text()).toContain('Formulario de Registro Entrega de Donación');
  });
});
