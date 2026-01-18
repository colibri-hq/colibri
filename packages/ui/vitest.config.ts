import config from "@colibri-hq/shared/vitest.config";
import { svelteTesting } from "@testing-library/svelte/vite";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
  config,
  defineConfig({
    test: {
      coverage: {
        exclude: [
          "node_modules/**",
          "dist/**",
          ".svelte-kit/**",
          ".turbo/**",
          ".cache/**",
          "**/*.d.ts",
          "**/*.test.ts",
          "**/*.spec.ts",
          "**/*.config.ts",
          ".storybook/**",
        ],
      },
      passWithNoTests: true,
      projects: [
        {
          extends: "./vite.config.ts",
          plugins: [svelteTesting()],
          test: {
            name: "client",
            environment: "jsdom",
            clearMocks: true,
            include: ["src/**/*.svelte.{test,spec}.{js,ts}"],
            exclude: ["src/lib/server/**"],
            setupFiles: ["./vitest-setup-client.ts"],
          },
        },
        {
          extends: "./vite.config.ts",
          test: {
            name: "server",
            environment: "node",
            include: ["src/**/*.{test,spec}.{js,ts}"],
            exclude: ["src/**/*.svelte.{test,spec}.{js,ts}"],
          },
        },
        {
          extends: "./vite.config.ts",
          test: {
            name: "browser",
            include: ["src/**/*.browser.{test,spec}.{js,ts}"],
            browser: {
              enabled: true,
              provider: playwright(),
              instances: [{ browser: "chromium" }],
            },
          },
        },
      ],
    },
  }),
);
