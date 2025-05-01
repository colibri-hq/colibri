import type { Linter } from "eslint";
import oclif from "eslint-config-oclif";
import prettier from "eslint-config-prettier/flat";

export default [
  {
    ignores: [".turbo/**/*", ".cache/**/*", "node_modules/**/*", "dist/**/*"],
  },
  ...oclif,
  prettier,
  {
    rules: {
      camelcase: ["error", { properties: "never" }],
      "perfectionist/sort-imports": [
        "error",
        {
          newlinesBetween: "never",
          type: "natural",
        },
      ],
    },
  },
] satisfies Linter.Config[];
