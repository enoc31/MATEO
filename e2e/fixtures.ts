import { test as base, expect } from '@playwright/test';
import { isExternalTarget } from './helpers/auth';

export const test = base.extend({
  page: async ({ page }, use) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    await page.addInitScript(() => {
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('bcv_last_sync_date', today);
    });

    await page.route('https://api.ipify.org/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ip: '127.0.0.1' }),
      });
    });

    await page.route('https://pydolarve.org/**', (route) => route.abort());
    await page.route('https://ve.dolarapi.com/**', (route) => route.abort());
    await page.route('https://rates.dolarvzla.com/**', (route) => route.abort());

    if (!isExternalTarget) {
      await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
      await page.route('https://fonts.gstatic.com/**', (route) => route.abort());
      await page.route('https://cnbv.org/**', (route) => route.abort());
    }

    await use(page);

    expect(pageErrors, 'No deben ocurrir errores JS no capturados en la página').toEqual([]);
  },
});

export { expect };
