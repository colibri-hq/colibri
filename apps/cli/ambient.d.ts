declare module "eslint-plugin-import" {
  import type { Linter } from "eslint";

  const importPlugin: {
    flatConfigs: {
      recommended: Linter.Config[];
      typescript: Linter.Config[];
    };
  };

  // noinspection JSUnusedGlobalSymbols
  export default importPlugin;
}

declare module "eslint-config-xo/space" {
  import type { Linter } from "eslint";

  const xo: Linter.Config[];

  // noinspection JSUnusedGlobalSymbols
  export default xo;
}
