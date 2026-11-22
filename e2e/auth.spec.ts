import { expect, test } from '@playwright/test';
import { loginAs, prepareSimulatedApp } from './support/app';

test.describe('Acceso y roles', () => {
  test('la app corre en Modo Simulación y nunca contra Supabase real', async ({ page }) => {
    await prepareSimulatedApp(page);
    await page.goto('/login');

    // Si esto falla, el webServer de Playwright no está forzando el Modo Simulación.
    await expect(page.getByText('DEMO LOCAL SIMULADO')).toBeVisible();
  });

  test('el administrador entra y ve todos los módulos de la ONG', async ({ page }) => {
    await prepareSimulatedApp(page, { skipWelcomeFor: 'Admin ONG' });
    await loginAs(page, 'Admin ONG');

    const main = page.getByRole('main');
    await expect(page.getByText('Director Nacional CNBV (Admin)')).toBeVisible();
    for (const modulo of [
      'Donaciones e Ingresos',
      'Auditoría de Fondos',
      'Presupuestos y Proyectos',
      'Gestión de Usuarios',
    ]) {
      await expect(main.getByRole('button', { name: modulo })).toBeVisible();
    }
  });

  test('el auditor solo ve sus módulos y no puede entrar a Gestión de Usuarios', async ({
    page,
  }) => {
    await prepareSimulatedApp(page, { skipWelcomeFor: 'Auditor' });
    await loginAs(page, 'Auditor');

    const main = page.getByRole('main');
    await expect(main.getByRole('button', { name: 'Auditoría de Fondos' })).toBeVisible();
    await expect(main.getByRole('button', { name: 'Gestión de Usuarios' })).toHaveCount(0);

    await page.goto('/app/users');
    await expect(page.getByText('Acceso Denegado')).toBeVisible();
  });

  test('el coordinador no puede entrar a Auditoría de Fondos', async ({ page }) => {
    await prepareSimulatedApp(page, { skipWelcomeFor: 'Coordinador' });
    await loginAs(page, 'Coordinador');

    await page.goto('/app/audit');
    await expect(page.getByText('Acceso Denegado')).toBeVisible();
  });

  test('un correo que no existe muestra un error y no inicia sesión', async ({ page }) => {
    await prepareSimulatedApp(page);
    await page.goto('/login');

    await page.getByLabel('Correo electrónico').fill('nadie@ejemplo.org');
    await page.getByLabel('Contraseña', { exact: true }).fill('cualquier-clave');
    await page.getByRole('button', { name: /^Iniciar sesión$/i }).click();

    await expect(
      page.getByText('Usuario no encontrado en la base de datos simulada local.'),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('el modal de bienvenida aparece la primera vez y no vuelve tras aceptarlo', async ({
    page,
  }) => {
    await prepareSimulatedApp(page);
    await loginAs(page, 'Admin ONG');
    await page.getByRole('main').getByRole('button', { name: 'Donaciones e Ingresos' }).click();

    const bienvenida = page.getByRole('heading', { name: '¡Bienvenido a MATEO!' });
    await expect(bienvenida).toBeVisible();
    await page.getByRole('button', { name: 'Entendido, ¡Comencemos!' }).click();
    await expect(bienvenida).toBeHidden();

    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Registro de Diezmos y Ofrendas' }),
    ).toBeVisible();
    await expect(bienvenida).toBeHidden();
  });

  test('cerrar sesión vuelve al login', async ({ page }) => {
    await prepareSimulatedApp(page, { skipWelcomeFor: 'Admin ONG' });
    await loginAs(page, 'Admin ONG');

    await page.getByRole('button', { name: 'Salir' }).click();
    await expect(page.getByRole('button', { name: /^Iniciar sesión$/i })).toBeVisible();
  });
});
