import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export const config = defineConfig({
  test: {
    browser: { enabled: true, provider: playwright(), instances: [{ browser: "chromium" }] },
  },
});

export default config;
