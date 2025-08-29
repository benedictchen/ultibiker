import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { unlinkSync } from 'fs';
import { join } from 'path';

// Test database path
const TEST_DB_PATH = './test-ultibiker.db';

beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = TEST_DB_PATH;
  process.env.LOG_LEVEL = 'error'; // Suppress logs during tests
  process.env.ANT_STICK_ENABLED = 'false'; // Disable hardware during tests
  process.env.BLE_ENABLED = 'false'; // Disable hardware during tests
});

beforeEach(async () => {
  // Clean up test database before each test
  try {
    unlinkSync(TEST_DB_PATH);
  } catch (error) {
    // Database doesn't exist, that's fine
  }
});

afterEach(async () => {
  // Clean up test database after each test
  try {
    unlinkSync(TEST_DB_PATH);
  } catch (error) {
    // Database doesn't exist, that's fine
  }
});

afterAll(async () => {
  // Final cleanup
  try {
    unlinkSync(TEST_DB_PATH);
  } catch (error) {
    // Database doesn't exist, that's fine
  }
});