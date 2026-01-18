import { config } from "@colibri-hq/shared/eslint.config";
import svelteConfig from "./svelte.config.js";

export default config(
  { tsconfigRootDir: import.meta.dirname, svelteConfig },
  {
    files: ["src/**/*.stories.svelte"],
    languageOptions: {
      parserOptions: { projectService: false, project: "./tsconfig.storybook.json" },
    },
  },

  // Allow inline styles for components that need dynamic colors
  {
    files: ["src/lib/ui/ColorPicker/ColorPicker.svelte"],
    rules: { "svelte/no-inline-styles": "off" },
  },
);
