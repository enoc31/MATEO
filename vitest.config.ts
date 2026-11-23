/// <reference types="vitest" />
import { configDefaults, defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Vitest uses Vite internally to transform React tests.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    globals: true,
    // e2e/ son pruebas de Playwright (npm run test:e2e), no de Vitest
    exclude: [...configDefaults.exclude, 'e2e/**', '.stryker-tmp/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/**',
        'dist/**',
        'coverage/**',
        '**/*.test.{ts,tsx}',
        'src/setupTests.ts',
        'vitest.config.ts',
        'eslint.config.js',
      ],
    },
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './coverage/junit.xml',
    },
  },
});
