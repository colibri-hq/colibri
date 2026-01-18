import { config } from "@colibri-hq/shared/vitest.config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(
  config,
  defineConfig({
    define: {
      // Required globals from vite.config.ts for content module
      CONTENT_ROOT_DIR: '"/content"',
      PACKAGE_REPOSITORY_URL: '"https://github.com/colibri-hq/colibri.git"',
      PACKAGE_HOMEPAGE_URL: '"https://github.com/colibri-hq/colibri"',
      PACKAGE_BUGS_URL: '"https://github.com/colibri-hq/colibri/issues"',
    },
    plugins: [tailwindcss(), svelte()],
    resolve: {
      alias: {
        $lib: resolve(import.meta.dirname, "src/lib"),
        $content: resolve(import.meta.dirname, "content"),
        $components: resolve(import.meta.dirname, "src/lib/components"),
        $root: import.meta.dirname,
      },
    },
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
          "**/*.config.ts",
          "content/**",
          "src/build/**",
          "scripts/**",
          // Exclude Svelte components - they're presentational and tested via E2E
          "**/*.svelte",
          // Exclude barrel exports
          "**/index.ts",
        ],
        // Docs-specific thresholds: lower than default because most code is either
        // presentational (Svelte) or build-time (import.meta.glob)
        thresholds: { branches: 70, functions: 70, lines: 70, statements: 70 },
      },
      passWithNoTests: true,
      projects: [
        {
          extends: "./vitest.config.ts",
          test: {
            name: "unit",
            environment: "node",
            include: ["src/**/*.test.ts"],
            exclude: ["tests/**"],
            setupFiles: ["./tests/fixtures/setup.ts"],
          },
        },
        {
          extends: "./vitest.config.ts",
          test: {
            name: "e2e",
            environment: "node",
            include: ["tests/e2e/**/*.test.ts"],
            exclude: ["tests/e2e/globalSetup.ts", "src/**"],
            // E2E tests use fetch against the dev server - no browser needed
            testTimeout: 30000,
            // Start dev server before tests, shut down after
            globalSetup: ["./tests/e2e/globalSetup.ts"],
          },
        },
      ],
    },
  }),
);
