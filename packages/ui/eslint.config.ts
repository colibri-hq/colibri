import { config } from "@colibri-hq/shared/eslint.config";
import svelteConfig from "./svelte.config.js";

export default config(
  {
    tsconfigRootDir: import.meta.dirname,
    svelteConfig,
  },
  {
    files: ["src/**/*.stories.svelte"],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: "./tsconfig.storybook.json",
      },
    },
  },
) as ReturnType<typeof config>;
