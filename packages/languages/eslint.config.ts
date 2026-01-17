import { config } from "@colibri-hq/shared/eslint.config";

export default [
  { ignores: ["src/generated/**", "**/*.test.ts"] },
  ...config({ tsconfigRootDir: import.meta.dirname }),
] as ReturnType<typeof config>;
