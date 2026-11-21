# Pruebas End-to-End (E2E) con Playwright

Esta carpeta contiene la suite de pruebas E2E de **MATEO (`ong-donation-audit`)** ejecutadas con `@playwright/test` sobre los proyectos `chromium` (Desktop Chrome) y `mobile-chrome` (Pixel 5).

## Comandos locales

- `npm run test:e2e`: compila la aplicación en modo simulación (`dist-e2e/`) y ejecuta toda la suite E2E.
- `npm run test:e2e:ui`: abre la interfaz interactiva de Playwright.
- `npm run test:e2e:headed`: ejecuta las pruebas con navegador visible.
- `npm run test:e2e:report`: abre el último reporte HTML (`playwright-report/`).

## Aislamiento en Modo Simulación vs `.env` local

Aunque exista un archivo `.env` local con credenciales reales de Supabase, `playwright.config.ts` inyecta variables placeholder (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_OTEL_ENABLED=false`) al compilar `dist-e2e/` y levantar `vite preview` en `http://127.0.0.1:4174`. Esto garantiza que las pruebas corran siempre de forma determinística en **Modo Simulación local** (`localStorage`) sin afectar entornos reales.

Los fixtures en `e2e/fixtures.ts` además:

- Verifican que no haya errores JS no capturados (`pageerror`).
- Interceptan llamadas externas (BCV, `api.ipify.org`, fuentes y logos externos en local) para evitar flakiness.

## Ejecutar contra Preview / Staging externo

Para probar un despliegue remoto (solo los specs compatibles con entorno real, como `landing.spec.ts`):

```bash
PLAYWRIGHT_BASE_URL=https://tu-preview.vercel.app npx playwright test
```

En GitHub Actions (`.github/workflows/e2e.yml`), puedes lanzar el workflow manualmente con `workflow_dispatch` indicando el input opcional `base_url`.

## Artifacts en CI

- `playwright-report`: reporte HTML completo de la ejecución (retención 14 días).
- `playwright-test-results`: traces, capturas de pantalla y videos cuando ocurre algún fallo (retención 14 días).

## Cómo agregar nuevos specs

1. Importa `{ test, expect }` desde `./fixtures` (no directamente desde `@playwright/test`) para heredar la detección de `pageerror` y el stubbing de red.
2. Reutiliza los helpers en `e2e/helpers/auth.ts` (`loginAsSimRole`, `logoutFromApp`, `seedActiveJornada`, `drawSignature`).
3. Si el spec depende del Modo Simulación local, agrega `test.skip(isExternalTarget, 'Requiere modo simulación local');`.
4. Ejecuta `npm run lint`, `npm run format:check` y `npm run test:e2e` antes de abrir el PR.
