import { test, expect } from './fixtures';
import { isExternalTarget, loginAsSimRole } from './helpers/auth';

test.describe('Flujo de Ingresos y Donaciones', () => {
  test.skip(isExternalTarget, 'Requiere modo simulación local');

  test('muestra donaciones iniciales y registra una nueva ofrenda en efectivo USD', async ({
    page,
  }) => {
    await loginAsSimRole(page, 'administrador');
    await page.goto('/app/incomes');

    await expect(page.getByText('Registro de Diezmos y Ofrendas')).toBeVisible();
    await expect(page.getByText('Alianza Bautista Internacional')).toBeVisible();

    await page.getByRole('button', { name: /Registrar Ofrenda \/ Diezmo/i }).click();
    await expect(page).toHaveURL(/\/app\/nuevo-ingreso/);

    const projectSelect = page
      .locator('.form-group', { hasText: /Proyecto Receptor/i })
      .locator('select');
    await projectSelect.selectOption({ index: 1 });

    const donorSelect = page
      .locator('.form-group', { hasText: /Feligrés \/ Donante/i })
      .locator('select');
    await donorSelect.selectOption({ index: 1 });

    await page.getByRole('button', { name: /Dinero en Efectivo/i }).click();

    const amountInput = page
      .locator('.form-group', { hasText: /Monto de la Ofrenda/i })
      .locator('input');
    await amountInput.fill('150');

    await page
      .locator('.form-group', { hasText: /Descripción y Detalles/i })
      .locator('textarea')
      .fill('Ofrenda E2E prueba automatizada');

    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Ofrenda / Diezmo registrado con éxito');
      await dialog.accept();
    });

    await page.getByRole('button', { name: /Guardar Ofrenda \/ Diezmo/i }).click();

    await expect(page).toHaveURL(/\/app\/incomes/);
    // La donación sembrada es por transferencia: solo la ofrenda nueva en efectivo
    // (no conciliada) muestra el botón "Conciliar en Caja".
    await expect(page.getByRole('button', { name: /Conciliar en Caja/i })).toHaveCount(1);
  });

  test('calcula la vista previa de conversión multi-moneda en Bolívares (VES)', async ({
    page,
  }) => {
    await loginAsSimRole(page, 'administrador');
    await page.goto('/app/nuevo-ingreso');

    await page.getByRole('button', { name: /Bolívares \(VES\)/i }).click();
    await expect(page.getByText('Tasa de Cambio BCV (Bs./USD) *')).toBeVisible();

    const manualRatePlaceholder = page.getByPlaceholder('Ingrese tasa');
    if (await manualRatePlaceholder.isVisible()) {
      await manualRatePlaceholder.fill('100');
    }

    const amountInput = page
      .locator('.form-group', { hasText: /Monto de la Ofrenda/i })
      .locator('input');
    await amountInput.fill('500');

    await expect(page.getByText('Equivalente en Dólares (USD):')).toBeVisible();
  });
});
