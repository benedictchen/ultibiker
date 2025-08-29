import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    exclude: [
      'tests/test-runner.ts', // Exclude fake test runner
      'node_modules/**',
      'dist/**'
    ],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@ultibiker/core': resolve(__dirname, '../core/src'),
    }
  }
});