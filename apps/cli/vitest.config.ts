import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        "node_modules/**",
        "dist/**",
        "**/*.d.ts",
        "**/*.test.ts",
        "**/*.config.ts",
        "test/**",
      ],
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
    disableConsoleIntercept: true,
    environment: "node",
    globals: true,
    include: ["test/**/*.test.ts"],
  },
});
