import type { StorybookConfig } from "@storybook/sveltekit";

const config = {
  core: {
    disableWhatsNewNotifications: true,
    enableCrashReports: false,
    disableTelemetry: true,
  },
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|ts|svelte)"],
  addons: [
    "@storybook/addon-svelte-csf",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "@storybook/sveltekit",
    options: {},
  },
  docs: {
    defaultName: "Documentation",
  },
} satisfies StorybookConfig;

export default config;
