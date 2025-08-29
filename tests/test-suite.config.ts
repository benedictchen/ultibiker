/**
 * UltiBiker Test Suite Configuration
 * Comprehensive testing setup for all application layers
 */

import { defineConfig } from 'vitest/config';
import { defineConfig as definePlaywrightConfig } from '@playwright/test';

// Vitest configuration for unit and integration tests
export const vitestConfig = defineConfig({
  test: {
    // Test environment
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests/**',
        '**/*.d.ts',
        'drizzle/**',
        'public/**',
        '**/*.config.*',
        'scripts/**'
      ],
      thresholds: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        },
        // Specific thresholds for critical components
        'src/api/**': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        },
        'src/database/**': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },
        'src/sensors/**': {
          branches: 75, // Lower due to hardware dependency
          functions: 80,
          lines: 75,
          statements: 75
        }
      }
    },
    
    // Test execution configuration
    testTimeout: 15000,
    hookTimeout: 10000,
    maxConcurrency: 5,
    
    // Test file patterns
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.spec.ts'
    ],
    exclude: [
      'tests/e2e/**/*', // E2E tests run separately with Playwright
      'node_modules/**',
      'dist/**'
    ],
    
    // Test categories
    reporters: ['verbose', 'json', 'html'],
    
    // Parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 4
      }
    }
  },
  
  // Path resolution
  resolve: {
    alias: {
      '@': './src',
      '@tests': './tests'
    }
  },
  
  // Define test categories
  define: {
    TEST_CATEGORIES: {
      UNIT: 'unit',
      INTEGRATION: 'integration', 
      API: 'api',
      DATABASE: 'database',
      ERROR_HANDLING: 'error-handling'
    }
  }
});

// Playwright configuration for E2E tests
export const playwrightConfig = definePlaywrightConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['list']
  ],
  
  use: {
    actionTimeout: 0,
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  projects: [
    {
      name: 'chromium',
      use: { ...require('@playwright/test').devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...require('@playwright/test').devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...require('@playwright/test').devices['Desktop Safari'] },
    },
    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: { ...require('@playwright/test').devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...require('@playwright/test').devices['iPhone 12'] },
    }
  ],

  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI
  }
});

// Test suite categories and their configurations
export const testCategories = {
  unit: {
    pattern: 'tests/**/*.test.ts',
    exclude: ['tests/e2e/**', 'tests/integration/**'],
    timeout: 5000,
    description: 'Unit tests for individual components and functions'
  },
  
  integration: {
    pattern: 'tests/integration/**/*.test.ts',
    timeout: 15000,
    description: 'Integration tests for component interactions'
  },
  
  api: {
    pattern: 'tests/api/**/*.test.ts',
    timeout: 10000,
    description: 'API endpoint tests'
  },
  
  database: {
    pattern: 'tests/database/**/*.test.ts',
    timeout: 10000,
    description: 'Database schema and operations tests'
  },
  
  errorHandling: {
    pattern: 'tests/**/*error*.test.ts',
    timeout: 10000,
    description: 'Error handling and recovery tests'
  },
  
  e2e: {
    pattern: 'tests/e2e/**/*.spec.ts',
    timeout: 30000,
    description: 'End-to-end browser tests'
  },
  
  sensors: {
    pattern: 'tests/sensors/**/*.test.ts',
    timeout: 20000,
    description: 'Sensor integration tests (requires hardware)'
  }
};

// Quality gates and success criteria
export const qualityGates = {
  coverage: {
    minimum: 80,
    target: 90,
    critical: ['src/api/**', 'src/database/**']
  },
  
  performance: {
    maxTestDuration: 30000,
    maxSuiteDuration: 300000, // 5 minutes
    memoryThreshold: '512MB'
  },
  
  reliability: {
    maxFlakiness: 0.05, // 5% flaky test rate
    minSuccessRate: 0.95, // 95% success rate
    maxRetries: 3
  }
};