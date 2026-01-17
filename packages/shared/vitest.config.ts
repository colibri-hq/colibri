import { defineConfig, mergeConfig } from "vitest/config";

export { mergeConfig };

export const config = defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    reporters: process.env.CI ? ["default", "github-actions"] : ["default"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/**",
        "dist/**",
        ".turbo/**",
        ".cache/**",
        "**/*.d.ts",
        "**/*.test.ts",
        "**/*.config.ts",
      ],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
});

export default config;
