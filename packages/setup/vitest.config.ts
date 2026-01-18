import { config } from "@colibri-hq/shared/vitest.config";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
  config,
  defineConfig({
    test: {
      // 2 minutes for container startup
      hookTimeout: 120_000,
      testTimeout: 120_000,
    },
  }),
);
