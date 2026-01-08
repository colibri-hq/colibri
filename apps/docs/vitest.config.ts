import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  plugins: [tailwindcss(), svelte()],
  define: {
    // Required globals from vite.config.ts for content module
    CONTENT_ROOT_DIR: '"/content"',
    PACKAGE_REPOSITORY_URL: '"https://github.com/colibri-hq/colibri.git"',
    PACKAGE_HOMEPAGE_URL: '"https://github.com/colibri-hq/colibri"',
    PACKAGE_BUGS_URL: '"https://github.com/colibri-hq/colibri/issues"',
  },
  resolve: {
    alias: {
      $lib: resolve(import.meta.dirname, "src/lib"),
      $content: resolve(import.meta.dirname, "content"),
      $components: resolve(import.meta.dirname, "src/lib/components"),
      $root: import.meta.dirname,
    },
  },
  test: {
    globals: true,
    passWithNoTests: true,
    projects: [
      {
        extends: "./vitest.config.ts",
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
          setupFiles: ["./tests/fixtures/setup.ts"],
        },
      },
      {
        extends: "./vitest.config.ts",
        test: {
          name: "e2e",
          environment: "node",
          include: ["tests/e2e/**/*.test.ts"],
          // E2E tests use fetch against the dev server - no browser needed
          testTimeout: 30000,
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
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
      ],
      thresholds: {
        statements: 70,
        branches: 65,
        functions: 70,
        lines: 70,
      },
    },
  },
});
