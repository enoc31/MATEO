import { test, expect } from './fixtures';

test.describe('Landing Page y Rutas Públicas', () => {
  test('renderiza la landing page con branding MATEO y secciones principales', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/MATEO/i);
    await expect(page.locator('#inicio')).toBeVisible();
    await expect(page.locator('#modulos')).toBeVisible();
    await expect(page.locator('#precios')).toBeVisible();
    await expect(page.locator('#faq')).toBeVisible();
  });

  test('navega desde la landing hacia el formulario de login', async ({ page, isMobile }) => {
    await page.goto('/');

    if (isMobile) {
      await page.getByRole('button', { name: 'Abrir menú' }).click();
    }

    // Existen varios botones "Iniciar Sesión" (navbar/menú móvil y hero); el primero en el DOM basta.
    await page.getByRole('button', { name: 'Iniciar Sesión' }).first().click();
    await expect(page).toHaveURL(/\/login/);

    await expect(page.getByLabel(/Correo Electrónico/i)).toBeVisible();
    await expect(page.getByLabel(/Contraseña/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Ingresar a la Plataforma/i })).toBeVisible();
  });

  test('carga correctamente las rutas públicas de recuperación, registro y aceptación de invitación', async ({
    page,
  }) => {
    await page.goto('/forgot-password');
    await expect(page.locator('form')).toBeVisible();

    await page.goto('/registro-ong');
    await expect(page.locator('body')).not.toBeEmpty();

    await page.goto('/aceptar-invitacion');
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('redirige a /login al intentar acceder a una ruta privada sin sesión', async ({ page }) => {
    await page.goto('/app/dashboard');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('button', { name: /Ingresar a la Plataforma/i })).toBeVisible();
  });
});
