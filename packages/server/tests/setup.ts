
import { beforeAll, afterAll } from "vitest";

beforeAll(async () => {
  console.log("🧪 Setting up test environment...");
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = ":memory:";
  process.env.LOG_LEVEL = "error";
});

afterAll(async () => {
  console.log("🧹 Cleaning up test environment...");
});

