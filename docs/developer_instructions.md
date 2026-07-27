# Instrucciones de Desarrollo: Corrección de Linter y Tipado en MATEO

Este documento detalla las tareas específicas requeridas para resolver los problemas de compilación y linter detectados en el proyecto **MATEO (ong-donation-audit)**. Está diseñado para que cualquier desarrollador o agente de código lo tome y complete la tarea sistemáticamente.

---

## Tarea 1: Exclusión del Directorio de Agentes en ESLint

### Problema

ESLint audita de forma no deseada los archivos en `.agents/` (carpeta de configuración de IA), lo cual provoca fallas de linter como:

```
error  A require() style import is forbidden  @typescript-eslint/no-require-imports
```

### Solución

1. Abrir el archivo [eslint.config.js](file:///c:/Users/gerar/Desktop/AppGravity/ONG-DONATION-AUDIT/eslint.config.js).
2. Añadir `'.agents'` e `'.agents/**'` a la lista de `ignores` en el primer bloque de configuración:

```javascript
// eslint.config.js
export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'coverage',
      '.vercel',
      'scratch',
      '*.cjs',
      '*.js',
      'check_users.js',
      '.agents',      // <-- Añadir esto
      '.agents/**',   // <-- Añadir esto
    ],
  },
  // ... resto de la configuración
```

---

## Tarea 2: Reducción y Eliminación del Uso de `any`

### Problema

Hay **92 advertencias** referentes a `@typescript-eslint/no-explicit-any`. Esto viola las reglas estrictas de tipado de [AGENTS.md](file:///c:/Users/gerar/Desktop/AppGravity/ONG-DONATION-AUDIT/AGENTS.md).

### Guía de Remediación

#### A. Archivo: [Login.tsx](file:///c:/Users/gerar/Desktop/AppGravity/ONG-DONATION-AUDIT/src/features/auth/Login.tsx)

- **Líneas afectadas**: `37:6`, `40:6`
- **Código actual**:
  ```typescript
  (window as any).onRecaptchaSuccess = (token: string) => { ... }
  (window as any).onRecaptchaExpired = () => { ... }
  ```
- **Solución recomendada**: Extender la interfaz `Window` global de TypeScript o hacer un casteo más específico y seguro:
  ```typescript
  interface CustomWindow extends Window {
    onRecaptchaSuccess?: (token: string) => void;
    onRecaptchaExpired?: () => void;
  }
  (window as CustomWindow).onRecaptchaSuccess = (token: string) => { ... };
  ```

#### B. Archivo: [TasasManager.tsx](file:///c:/Users/gerar/Desktop/AppGravity/ONG-DONATION-AUDIT/src/features/tasas/TasasManager.tsx)

- **Líneas afectadas**: `63:29`, `73:44`, `94:19`, `162:19`, `182:36`, `239:19`, `261:19`
- **Acción**: Declarar tipos de datos para las respuestas del API de Supabase y tasas de cambio en lugar de utilizar `any` en los arreglos de retorno y payloads de guardado.

#### C. Funciones de Supabase (Edge Functions) en `supabase/functions/`

- **Archivos**: `create-user/index.ts`, `delete-user/index.ts`, `gcs-signed-url/index.ts`, `notify-approval/index.ts`, `notify-registration/index.ts`
- **Acción**: Declarar interfaces explícitas para el cuerpo de la petición (`Request`) y respuesta de cada Edge Function.

---

## Verificación de Éxito

El agente responsable debe validar que los cambios son correctos ejecutando:

```bash
# 1. Ejecutar el formateador de código
npm run format

# 2. Ejecutar el linter (Debe terminar con exit code 0 y sin errores críticos)
npm run lint

# 3. Compilar el proyecto para verificar tipo e integridad
npm run build
```
