import { config } from "@colibri-hq/shared/eslint.config";
import svelteConfig from "./svelte.config.js";

export default [
  ...config({ tsconfigRootDir: import.meta.dirname, svelteConfig }),
  {
    // Disable navigation resolution rule for static docs site
    // The docs app uses simple path prefixes with `base` from `$app/paths`
    files: ["**/*.svelte"],
    rules: { "svelte/no-navigation-without-resolve": "off" },
  },
];
