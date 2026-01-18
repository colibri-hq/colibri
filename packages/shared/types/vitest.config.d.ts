declare module "@colibri-hq/shared/vitest.config" {
  import { config as Config } from "../vitest.config";

  export const config: typeof Config;

  export default config;
}
