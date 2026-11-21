import { expect, test } from '@playwright/test';
import { loginAs, prepareSimulatedApp } from './support/app';

const DEMO_ONG_ID = '11111111-1111-1111-1111-111111111111';

test.describe('Ingresos y Gastos (Ekklesia) & Portal Público de Aportes', () => {
  test('un miembro reporta un Pago Móvil en el portal público y Tesorería lo aprueba en Ingresos y Gastos', async ({
    page,
  }) => {
    await prepareSimulatedApp(page, { skipWelcomeFor: 'Admin ONG' });

    // 1. Abrir enlace público sin autenticación
    await page.goto(`/aportar/${DEMO_ONG_ID}`);
    await expect(page.getByText('Portal de Reporte de Diezmos y Ofrendas')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Datos Bancarios y Pago Móvil de la Iglesia' }),
    ).toBeVisible();

    // 2. Llenar datos de Pago Móvil en VES sin referencia para validar campo obligatorio
    await page.getByLabel('Nombre completo').fill('María Fernanda Pérez');
    await page.getByLabel(/Monto \(VES\) \*/).fill('1500');
    await expect(page.getByText(/Equivalente en USD:/)).toBeVisible();

    await page.getByLabel('Banco Emisor *').selectOption('Banesco');
    await page.getByLabel('Teléfono Emisor *').fill('04141234567');
    await page.getByRole('button', { name: 'Enviar Reporte de Aporte' }).click();
    await expect(
      page.getByText('El número de referencia es obligatorio para Pago Móvil.'),
    ).toBeVisible();

    // 3. Completar referencia y enviar
    await page.getByLabel('Número de Referencia *').fill('88776655');
    await page.getByRole('button', { name: 'Enviar Reporte de Aporte' }).click();

    // 4. Pantalla de confirmación con código APO-
    await expect(
      page.getByRole('heading', { name: '¡Reporte Recibido por Tesorería!' }),
    ).toBeVisible();
    await expect(page.getByText(/APO-[A-Z0-9]{6}/)).toBeVisible();

    // 5. Iniciar sesión como Admin ONG y verificar en /app/finance -> Por Verificar
    await loginAs(page, 'Admin ONG');
    await page.goto('/app/finance');
    await expect(page.getByRole('heading', { name: /Ingresos y Gastos/i })).toBeVisible();

    await page.getByRole('tab', { name: /Por Verificar/i }).click();
    await expect(page.getByText('María Fernanda Pérez')).toBeVisible();
    await expect(page.getByText('88776655')).toBeVisible();

    // 6. Aprobar el reporte pendiente
    const reportCard = page.locator('.card').filter({ hasText: 'María Fernanda Pérez' }).first();
    await reportCard.getByRole('button', { name: 'Aprobar', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmar Aprobación' }).click();

    await expect(page.getByText('Aporte aprobado y sumado al libro de ingresos.')).toBeVisible();
  });

  test('permite reportar Transferencia del mismo banco sin referencia como Aporte Anónimo', async ({
    page,
  }) => {
    await prepareSimulatedApp(page);
    await page.goto(`/aportar/${DEMO_ONG_ID}`);

    await page.getByLabel(/Aporte Anónimo \/ Visitante/i).check();
    await page.getByLabel('Categoría *').selectOption('ofrenda');
    await page.getByRole('button', { name: 'USD' }).click();
    await page.getByLabel(/Monto \(USD\) \*/).fill('25');

    await page.getByRole('button', { name: 'Transferencia' }).click();
    await page.getByLabel('Banco Emisor *').selectOption('BBVA Provincial');
    await page.getByLabel(/Transferencia del mismo banco/i).check();

    await page.getByRole('button', { name: 'Enviar Reporte de Aporte' }).click();
    await expect(
      page.getByRole('heading', { name: '¡Reporte Recibido por Tesorería!' }),
    ).toBeVisible();
  });

  test('el Coordinador en Ingresos y Gastos solo ve la pestaña de Gastos', async ({ page }) => {
    await prepareSimulatedApp(page, { skipWelcomeFor: 'Coordinador' });
    await loginAs(page, 'Coordinador');
    await page.goto('/app/finance');

    await expect(page.getByRole('tab', { name: /^Gastos$/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Por Verificar/i })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: /Cuentas & Enlace/i })).toHaveCount(0);
  });
});
