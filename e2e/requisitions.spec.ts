import { test, expect } from './fixtures';
import { isExternalTarget, loginAsSimRole, logoutFromApp } from './helpers/auth';

test.describe('Flujo de Solicitudes de Gasto (Requisiciones)', () => {
  test.skip(isExternalTarget, 'Requiere modo simulación local');

  test('Coordinador crea una solicitud y Administrador otorga el primer visto bueno', async ({
    page,
  }) => {
    await loginAsSimRole(page, 'coordinador');
    await page.goto('/app/requisitions');

    await page.getByRole('button', { name: /Nueva Solicitud/i }).click();
    await expect(page.getByRole('heading', { name: 'Nueva Solicitud de Fondos' })).toBeVisible();

    await page.locator('#req-proyecto').selectOption({ index: 1 });
    await page.locator('#req-categoria').selectOption({ index: 1 });

    const partidaSelect = page.locator('#req-partida');
    await expect(partidaSelect).toBeVisible();
    await partidaSelect.selectOption({ index: 1 });

    await page.locator('#req-monto').fill('250');
    await page.locator('#req-motivo').fill('Compra de insumos médicos E2E');

    await page.getByRole('button', { name: /Solicitar/i }).click();

    const createdRow = page.locator('tbody tr', { hasText: '$250.00' }).first();
    await expect(createdRow).toBeVisible();
    await expect(createdRow.getByText('Aprobación 1 (Falta)')).toBeVisible();

    await logoutFromApp(page);
    await loginAsSimRole(page, 'administrador');
    await page.goto('/app/requisitions');

    const adminRow = page.locator('tbody tr', { hasText: '$250.00' }).first();
    await expect(adminRow).toBeVisible();
    await adminRow.getByRole('button', { name: /Evaluar/i }).click();

    await expect(page.getByRole('heading', { name: 'Detalle de Requisición' })).toBeVisible();
    await expect(page.getByText('Compra de insumos médicos E2E')).toBeVisible();

    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Firma registrada exitosamente');
      await dialog.accept();
    });

    await page.getByRole('button', { name: /Firmar Primer Visto Bueno/i }).click();

    await expect(adminRow.getByText('Aprobación 2 (Falta)')).toBeVisible();
  });
});
