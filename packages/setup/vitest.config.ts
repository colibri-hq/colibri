import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        "node_modules/**",
        "dist/**",
        ".turbo/**",
        ".cache/**",
        ".svelte-kit/**",
        "**/*.d.ts",
        "**/*.test.ts",
        "**/*.config.ts",
      ],
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
    },
    environment: "node",
    globals: true,
    hookTimeout: 120_000,
    include: ["src/**/*.test.ts"],
    testTimeout: 120_000, // 2 minutes for container startup
  },
});
