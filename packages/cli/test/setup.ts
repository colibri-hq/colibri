import { cleanup } from "@oclif/test";
import { afterAll, beforeAll } from "vitest";

beforeAll(() => {
  // Any global setup before tests
});

afterAll(async () => {
  // Clean up after all tests
  await cleanup();
});
