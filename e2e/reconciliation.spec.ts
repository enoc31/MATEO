import { expect, test } from '@playwright/test';
import { acceptNextAlert, loginAs, prepareSimulatedApp } from './support/app';

test('imports a bank statement and reconciles an expense', async ({ page }) => {
  await prepareSimulatedApp(page, { skipWelcomeFor: 'Admin ONG' });
  await loginAs(page, 'Admin ONG');
  await page.goto('/app/reconciliation');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'bank.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      'Fecha,Referencia,Descripcion,Monto\n2026-06-08,E2E-123,Pago E2E,-4850.00\n',
    ),
  });
  await expect(
    page.getByRole('heading', { name: 'Mapeador Dinámico de Columnas CSV' }),
  ).toBeVisible();
  const imported = await acceptNextAlert(page, () =>
    page.getByRole('button', { name: 'Confirmar e Importar' }).click(),
  );
  expect(imported).toContain('Se importaron 1 transacciones');
  await page.getByText('Pago E2E', { exact: true }).click();
  await page
    .getByText(/Compra de víveres, arroz, granos y harina/)
    .first()
    .click();
  const reconciled = await acceptNextAlert(page, () =>
    page.getByRole('button', { name: /Conciliar Movimiento/ }).click(),
  );
  expect(reconciled).toBe('Conciliación realizada con éxito.');
  await expect(page.getByText('Pago E2E', { exact: true })).toHaveCount(0);
});
