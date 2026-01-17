import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    cache: { dir: "node_modules/.vitest" },
    coverage: {
      allowExternal: false,
      enabled: true,
      provider: "v8",
      reportOnFailure: true,
      reporter: ["json-summary", "text", "text-summary"],
      reportsDirectory: "./.coverage",
    },
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    reporters: ["tree", "github-actions", "json"],
  },
});
