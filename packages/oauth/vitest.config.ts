import { defineConfig } from "vitest/config";

export default defineConfig({
  cacheDir: "./node_modules/.vite",
  test: {
    coverage: {
      allowExternal: false,
      enabled: true,
      provider: "v8",
      reportOnFailure: true,
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/**",
        "dist/**",
        "**/*.d.ts",
        "**/*.test.ts",
        "**/*.config.ts",
        "tests/**",
      ],
    },
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    reporters: process.env.CI ? ["default", "github-actions"] : ["default"],
  },
});
