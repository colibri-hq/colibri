declare module "eslint-config-oclif" {
  import type { Linter } from "eslint";

  const oclif: Linter.Config[];

  // noinspection JSUnusedGlobalSymbols
  export default oclif;
}
