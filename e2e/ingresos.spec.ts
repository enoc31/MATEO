import { expect, test, type Page } from '@playwright/test';
import { acceptNextAlert, formField, loginAs, prepareSimulatedApp } from './support/app';

/** Valor del recuadro "Total Diezmos y Ofrendas Registrados" (el div que sigue a la etiqueta). */
const totalRegistrado = (page: Page) =>
  page
    .getByText('Total Diezmos y Ofrendas Registrados', { exact: true })
    .locator('xpath=following-sibling::div[1]');

test.describe('Proyectos e ingresos', () => {
  test.beforeEach(async ({ page }) => {
    await prepareSimulatedApp(page, { skipWelcomeFor: 'Admin ONG' });
    await loginAs(page, 'Admin ONG');
  });

  test('crear un proyecto y registrarle una ofrenda en USD', async ({ page }) => {
    const proyecto = 'Comedor Comunitario E2E';

    // 1. Crear el proyecto
    await page.goto('/app/create-project');
    await formField(page, 'Nombre del Proyecto').fill(proyecto);
    await formField(page, 'Descripción del Alcance').fill('Proyecto creado por la prueba E2E');
    await formField(page, 'Seleccione Donante / Financiador').selectOption({
      label: '🇻🇪 Fondo Lazos de Amor (Nac)',
    });
    await page
      .getByRole('button', { name: /registrar|crear|guardar/i })
      .last()
      .click();

    await expect(page).toHaveURL(/\/app\/budget-wizard\?projectId=proj-/);
    await expect(page.getByText('Proyecto registrado con éxito')).toBeVisible();

    // 2. Registrar una ofrenda para ese proyecto, entrando desde la pantalla de ingresos
    await page.goto('/app/incomes');
    await expect(
      page.getByRole('heading', { name: 'Registro de Diezmos y Ofrendas' }),
    ).toBeVisible();
    await page.getByRole('button', { name: /Registrar Ofrenda \/ Diezmo/ }).click();

    await formField(page, 'Proyecto Receptor').selectOption({ label: proyecto });
    await formField(page, 'Feligrés / Donante').selectOption({ label: '🇬🇧 Tearfund' });
    await formField(page, 'Fecha de Recepción').fill('2026-10-15');
    await formField(page, 'Monto de la Ofrenda').fill('1250.50');
    await formField(page, 'Descripción y Detalles').fill('Ofrenda especial registrada por E2E');

    const mensaje = await acceptNextAlert(page, () =>
      page.getByRole('button', { name: /Guardar Ofrenda/ }).click(),
    );
    expect(mensaje).toContain('registrado con éxito');

    // 3. La ofrenda aparece en el historial y en los totales
    await expect(page).toHaveURL(/\/app\/incomes$/);
    const fila = page.getByRole('row').filter({ hasText: proyecto });
    await expect(fila).toHaveCount(1);
    await expect(fila).toContainText('15/10/2026');
    await expect(fila).toContainText('Tearfund');
    await expect(fila).toContainText('USD 1.250,50');

    // Total semilla (USD 35.000,00) + la nueva ofrenda
    await expect(totalRegistrado(page)).toHaveText('USD 36.250,50');

    // 4. Filtrar por el proyecto nuevo deja solo su ofrenda
    await page.getByRole('button', { name: proyecto, exact: true }).click();
    await expect(fila).toBeVisible();
    await expect(
      page.getByRole('row').filter({ hasText: 'Alianza Bautista Internacional' }),
    ).toHaveCount(0);
    await expect(page.getByText(/Mostrando 1 de 1 ofrendas/)).toBeVisible();
  });

  test('el formulario de ingresos no guarda si faltan campos obligatorios', async ({ page }) => {
    await page.goto('/app/incomes');
    await page.getByRole('button', { name: /Registrar Ofrenda \/ Diezmo/ }).click();

    // Solo el monto: falta el donante y la descripción
    await formField(page, 'Monto de la Ofrenda').fill('100');
    await page.getByRole('button', { name: /Guardar Ofrenda/ }).click();

    await expect(page).toHaveURL(/\/app\/nuevo-ingreso$/);
    await page.goto('/app/incomes');
    await expect(totalRegistrado(page)).toHaveText('USD 35.000,00');
  });
});
