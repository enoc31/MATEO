import { expect, test, type Page } from '@playwright/test';
import { acceptNextAlert, loginAs, prepareSimulatedApp } from './support/app';

// Gasto semilla del Modo Simulación, en estado "pendiente revision"
const GASTO_PENDIENTE = /víveres, arroz, granos y harina/;

const filaGasto = (page: Page) => page.getByRole('row').filter({ hasText: GASTO_PENDIENTE });

async function abrirGastoPendiente(page: Page): Promise<void> {
  await page.goto('/app/audit');
  await expect(filaGasto(page)).toContainText('pendiente revision');
  await filaGasto(page).getByRole('button', { name: 'Auditar Gasto' }).click();
  await expect(
    page.getByRole('heading', { name: 'Auditoría: Verificación de Soporte y Conformidad' }),
  ).toBeVisible();
}

test.describe('Auditoría de gastos', () => {
  test.beforeEach(async ({ page }) => {
    await prepareSimulatedApp(page, { skipWelcomeFor: 'Auditor' });
    await loginAs(page, 'Auditor');
  });

  test('el auditor aprueba un gasto con la lista de chequeo completa', async ({ page }) => {
    await abrirGastoPendiente(page);

    for (const pregunta of [
      /factura, recibo o soporte/,
      /conceptos y montos coinciden/,
      /actividades aprobadas/,
      /aprobación del coordinador/,
    ]) {
      await page.getByRole('checkbox', { name: pregunta }).check();
    }
    await page
      .getByRole('textbox', { name: /Observaciones de Auditoría/ })
      .fill('Soportes completos y conformes.');

    const mensaje = await acceptNextAlert(page, () =>
      page.getByRole('button', { name: 'Aprobar Gasto y Comprobante' }).click(),
    );
    expect(mensaje).toBe('Gasto APROBADO exitosamente.');

    await expect(page).toHaveURL(/\/app\/audit$/);
    await expect(filaGasto(page)).toContainText('aprobado');
  });

  test('rechazar un gasto exige observaciones', async ({ page }) => {
    await abrirGastoPendiente(page);

    const aviso = await acceptNextAlert(page, () =>
      page.getByRole('button', { name: 'Rechazar Soporte' }).click(),
    );
    expect(aviso).toContain('Debes incluir observaciones');
    await expect(page).toHaveURL(/\/app\/audit-detail/);

    await page
      .getByRole('textbox', { name: /Observaciones de Auditoría/ })
      .fill('Falta la factura original del proveedor.');
    const mensaje = await acceptNextAlert(page, () =>
      page.getByRole('button', { name: 'Rechazar Soporte' }).click(),
    );
    expect(mensaje).toBe('Gasto RECHAZADO exitosamente.');

    await expect(page).toHaveURL(/\/app\/audit$/);
    await expect(filaGasto(page)).toContainText('rechazado');
  });
});
