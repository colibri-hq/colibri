import { config } from "@colibri-hq/shared/vitest.config";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
  config,
  defineConfig({
    test: {
      coverage: {
        exclude: [
          "node_modules/**",
          "dist/**",
          ".turbo/**",
          ".cache/**",
          "**/*.d.ts",
          "**/*.test.ts",
          "**/*.config.ts",
          "scripts/**",
          "generated/**",
        ],
      },
    },
  }),
);
