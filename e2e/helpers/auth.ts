import { expect, type Page } from '@playwright/test';

export const isExternalTarget = Boolean(process.env.PLAYWRIGHT_BASE_URL?.trim());

export type SimRole = 'administrador' | 'coordinador' | 'auditor' | 'super_admin';

const ROLE_BUTTON_LABELS: Record<SimRole, string> = {
  administrador: 'Admin ONG',
  coordinador: 'Coordinador',
  auditor: 'Auditor',
  super_admin: 'SuperAdmin',
};

export interface SimLoginOptions {
  suppressCosoModal?: boolean;
}

/**
 * Inicia sesión en Modo Simulación local usando los accesos rápidos de `/login`.
 * Por defecto marca el modal de onboarding COSO como visto para pruebas funcionales.
 */
export async function loginAsSimRole(
  page: Page,
  role: SimRole,
  options: SimLoginOptions = {},
): Promise<void> {
  const { suppressCosoModal = true } = options;

  await page.goto('/login');
  await expect(page.getByText('DEMO LOCAL SIMULADO (ACCESO RÁPIDO):')).toBeVisible();

  if (suppressCosoModal) {
    await page.evaluate((targetRole) => {
      localStorage.setItem(`has_seen_coso_user-${targetRole}`, 'true');
    }, role);
  } else {
    await page.evaluate((targetRole) => {
      localStorage.removeItem(`has_seen_coso_user-${targetRole}`);
    }, role);
  }

  await page.getByRole('button', { name: ROLE_BUTTON_LABELS[role], exact: true }).click();

  if (role === 'super_admin') {
    await expect(page).toHaveURL(/\/saas-admin\/dashboard/);
  } else {
    await expect(page).toHaveURL(/\/app\/?$/);
  }
}

/**
 * Cierra la sesión actual desde el Panel de Aplicaciones preservando los datos en localStorage.
 */
export async function logoutFromApp(page: Page): Promise<void> {
  await page.goto('/app');
  await page.getByRole('button', { name: /Salir/i }).click();
  await expect(page).toHaveURL(/\/login/);
}

export interface JornadaSeedOverrides {
  id?: string;
  nombre?: string;
  fecha?: string;
  beneficios_entregados?: string;
  proyecto_id?: string;
}

/**
 * Siembra una jornada activa en localStorage para flujos de captura pública de beneficiarios.
 */
export async function seedActiveJornada(
  page: Page,
  overrides: JornadaSeedOverrides = {},
): Promise<{ id: string; nombre: string }> {
  const jornada = {
    id: overrides.id ?? 'jor-e2e-1',
    nombre: overrides.nombre ?? 'Jornada E2E Comunitaria',
    fecha: overrides.fecha ?? '2026-09-22',
    beneficios_entregados: overrides.beneficios_entregados ?? 'Comida, Medicamentos',
    proyecto_id: overrides.proyecto_id ?? 'proj-1',
    activa: true,
    created_at: new Date().toISOString(),
  };

  await page.evaluate((item) => {
    localStorage.setItem('cnbv_jornadas', JSON.stringify([item]));
  }, jornada);

  return { id: jornada.id, nombre: jornada.nombre };
}

/**
 * Dibuja un trazo válido sobre el lienzo de firma autógrafa (desktop y móvil).
 */
export async function drawSignature(page: Page, selector = 'canvas.sigCanvas'): Promise<void> {
  const canvas = page.locator(selector);
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error(`No se encontró boundingBox para el lienzo ${selector}`);
  }

  const startX = box.x + box.width * 0.2;
  const endX = box.x + box.width * 0.75;
  const centerY = box.y + box.height * 0.5;

  await page.mouse.move(startX, centerY);
  await page.mouse.down();
  await page.mouse.move(endX, centerY + 12, { steps: 6 });
  await page.mouse.up();
}
