import { defineConfig, mergeConfig } from "vitest/config";

export { mergeConfig };

export const config = defineConfig({
  cacheDir: "./.cache/.vite",
  test: {
    coverage: {
      enabled: true,
      exclude: [
        ".cache/**",
        ".svelte-kit/**",
        ".turbo/**",
        "dist/**",
        "tests/**",
        "test-reports/**",
        "node_modules/**",
        "**/*.config.ts",
        "**/*.d.ts",
        "**/*.test.ts",
      ],
      provider: "v8",
      reportOnFailure: true,
      reporter: ["text", ["json", { file: "coverage.json" }], ["html", { subdir: "coverage" }]],
      reportsDirectory: "./test-reports",
      thresholds: { branches: 45, functions: 50, lines: 50, statements: 50 },
    },
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    exclude: ["node_modules", "dist", "test-reports"],
    reporters: process.env.CI ? ["default", "github-actions"] : ["default", "json", "html"],
    outputFile: { json: "./test-reports/report.json", html: "./test-reports/tests/index.html" },
  },
});

export default config;
