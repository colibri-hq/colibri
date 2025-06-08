import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { StorybookConfig } from "@storybook/sveltekit";

const require = createRequire(import.meta.url);

const config = {
  core: {
    disableWhatsNewNotifications: true,
    enableCrashReports: false,
    disableTelemetry: true,
  },
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|ts|svelte)"],
  addons: [
    getAbsolutePath("@storybook/addon-svelte-csf"),
    getAbsolutePath("@storybook/addon-docs"),
  ],
  framework: {
    name: getAbsolutePath("@storybook/sveltekit"),
    options: {},
  },
  docs: {
    defaultName: "Documentation",
  },
} satisfies StorybookConfig;

export default config;

function getAbsolutePath(value: string): any {
  return dirname(require.resolve(join(value, "package.json")));
}
