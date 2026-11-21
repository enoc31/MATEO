import { test, expect } from './fixtures';
import { drawSignature, isExternalTarget, seedActiveJornada } from './helpers/auth';

test.describe('Registro Público de Beneficiarios en Campo', () => {
  test.skip(isExternalTarget, 'Requiere modo simulación local');

  test('muestra estado vacío cuando no hay jornadas de ayuda social activas', async ({ page }) => {
    await page.goto('/registro');

    await expect(
      page.getByRole('heading', { name: 'Seleccionar Jornada de Ayuda Social' }),
    ).toBeVisible();
    await expect(
      page.getByText(/No hay jornadas de ayuda social activas en este momento/i),
    ).toBeVisible();
  });

  test('registra un beneficiario con firma autógrafa digital y lo muestra en el historial', async ({
    page,
  }) => {
    await page.goto('/registro');
    await seedActiveJornada(page);
    await page.reload();

    await page.getByRole('button', { name: /Jornada E2E Comunitaria/i }).click();
    await expect(page.getByText('Jornada de Campo Activa: Jornada E2E Comunitaria')).toBeVisible();

    await page.getByPlaceholder('Ej: 12345678').fill('20123456');

    const nombreInput = page.locator('.form-group', { hasText: 'Nombre *' }).locator('input');
    await nombreInput.fill('María');

    const apellidoInput = page.locator('.form-group', { hasText: 'Apellido *' }).locator('input');
    await apellidoInput.fill('González');

    const birthInput = page
      .locator('.form-group', { hasText: 'Fecha de Nacimiento *' })
      .locator('input[type="date"]');
    await birthInput.fill('1990-05-15');

    await page.getByPlaceholder(/Calle 5/i).fill('Av. Bolívar, Casa 12');

    await page.getByRole('button', { name: 'Comida', exact: true }).click();
    await drawSignature(page);

    await page.getByRole('button', { name: /ENVIAR REGISTRO/i }).click();

    await expect(page.getByRole('heading', { name: '¡Registro Exitoso!' })).toBeVisible();

    await page.getByRole('button', { name: /Monitoreo e Historial de Entregas/i }).click();
    await expect(page.getByText(/20123456/)).toBeVisible();
    await expect(page.getByText(/María/i).first()).toBeVisible();
  });
});
