import { test, expect } from './fixtures';
import { isExternalTarget, loginAsSimRole, logoutFromApp } from './helpers/auth';

test.describe('Autenticación y Control de Acceso por Roles (RBAC)', () => {
  test.skip(isExternalTarget, 'Requiere modo simulación local');

  test('Admin ONG visualiza el panel completo, cierra el modal COSO en dashboard y cierra sesión', async ({
    page,
  }) => {
    await loginAsSimRole(page, 'administrador', { suppressCosoModal: false });

    await expect(page.getByText('Panel de Aplicaciones')).toBeVisible();
    await expect(page.getByText('Director Nacional CNBV (Admin)')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Conciliación Bancaria' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gestión de Usuarios' })).toBeVisible();

    await page.getByRole('button', { name: 'Tablero General' }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/);

    await expect(page.getByRole('heading', { name: '¡Bienvenido a MATEO!' })).toBeVisible();
    await page.getByRole('button', { name: 'Entendido, ¡Comencemos!' }).click();
    await expect(page.getByRole('heading', { name: '¡Bienvenido a MATEO!' })).toBeHidden();

    await expect(page.getByText('Error al cargar el tablero')).toBeHidden();

    await logoutFromApp(page);
    await expect(page.getByRole('button', { name: /Ingresar a la Plataforma/i })).toBeVisible();
  });

  test('Coordinador ve módulos operativos y recibe Acceso Denegado en rutas exclusivas de administrador', async ({
    page,
  }) => {
    await loginAsSimRole(page, 'coordinador');

    await expect(page.getByRole('button', { name: 'Solicitudes de Gasto' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gestión de Usuarios' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Conciliación Bancaria' })).toBeHidden();

    await page.goto('/app/users');
    await expect(page.getByRole('heading', { name: 'Acceso Denegado' })).toBeVisible();

    await page.goto('/app/reconciliation');
    await expect(page.getByRole('heading', { name: 'Acceso Denegado' })).toBeVisible();
  });

  test('Auditor accede a Auditoría de Fondos pero recibe Acceso Denegado en Gestión de Usuarios', async ({
    page,
  }) => {
    await loginAsSimRole(page, 'auditor');

    await page.goto('/app/audit');
    await expect(page.getByRole('heading', { name: 'Acceso Denegado' })).toBeHidden();

    await page.goto('/app/users');
    await expect(page.getByRole('heading', { name: 'Acceso Denegado' })).toBeVisible();
  });

  test('SuperAdmin es redirigido al portal SaaS', async ({ page }) => {
    await loginAsSimRole(page, 'super_admin');

    await expect(page).toHaveURL(/\/saas-admin\/dashboard/);
    await expect(
      page.getByRole('heading', { name: '¡Bienvenido al Panel del Control del SaaS!' }),
    ).toBeVisible();
  });
});
