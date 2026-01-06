import { playwright } from "@vitest/browser-playwright";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tailwindcss(), svelte()],
  test: {
    passWithNoTests: true,
    projects: [
      {
        extends: "./vitest.config.ts",
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
          exclude: ["src/**/*.svelte.test.ts", "src/**/*.browser.test.ts"],
        },
      },
      {
        extends: "./vitest.config.ts",
        test: {
          name: "browser",
          include: ["src/**/*.browser.{test,spec}.ts"],
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
