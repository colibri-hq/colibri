import { config } from "@colibri-hq/shared/eslint.config";
import svelteConfig from "./svelte.config.js";

export default config({ tsconfigRootDir: import.meta.dirname, svelteConfig }) as ReturnType<
  typeof config
>;
