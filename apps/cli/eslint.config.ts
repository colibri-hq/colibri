import type { Linter } from "eslint";
import eslint from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import imports from "eslint-plugin-import";
import node from "eslint-plugin-n";
import { configs as perfectionist } from "eslint-plugin-perfectionist";
import unicorn from "eslint-plugin-unicorn";
import globals from "globals";
import typescript, { configs } from "typescript-eslint";

const config = typescript.config(
  // region Ignored files
  { ignores: [".turbo/**/*", ".cache/**/*", "node_modules/**/*", "dist/**/*"] },
  // endregion

  // region Libraries
  eslint.configs.recommended,
  configs.recommended,
  node.configs["flat/recommended-module"],
  unicorn.configs.recommended,
  imports.flatConfigs.recommended,
  imports.flatConfigs.typescript,
  perfectionist["recommended-natural"],
  prettier,
  // endregion

  // region Tests
  { files: ["test/**/*.test.ts"], rules: { "@typescript-eslint/no-unused-expressions": "off" } },
  // endregion

  // region Sources
  {
    languageOptions: { globals: { ...globals.node } },
    plugins: { n: node },
    rules: {
      "@typescript-eslint/no-dupe-class-members": "error",
      "@typescript-eslint/no-redeclare": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-useless-constructor": "error",
      "@typescript-eslint/no-var-requires": "off",
      camelcase: ["error", { properties: "never" }],
      "capitalized-comments": 0,
      curly: 1,
      "default-case": 0,
      "import/no-unresolved": "error",
      "jsdoc/require-jsdoc": "off",
      "jsdoc/require-param": "off",
      "jsdoc/require-param-type": "off",
      "jsdoc/require-returns": "off",
      "jsdoc/require-returns-type": "off",
      "jsdoc/tag-lines": "off",
      "logical-assignment-operators": "off",
      "mocha/no-async-describe": "off",
      "mocha/no-identical-title": "off",
      "mocha/no-mocha-arrows": "off",
      "mocha/no-setup-in-describe": "off",
      "n/hashbang": 0,
      "n/no-missing-import": "off",
      "n/no-unsupported-features/es-syntax": "off",
      "no-dupe-class-members": "off",
      "no-redeclare": "off",
      "no-unused-expressions": "off",
      "no-unused-vars": "off",
      "no-useless-constructor": "off",
      "perfectionist/sort-classes": [
        "error",
        {
          groups: [
            "index-signature",
            "static-property",
            "property",
            "private-property",
            "constructor",
            "static-method",
            "static-private-method",
            ["get-method", "set-method"],
            "method",
            "private-method",
            "unknown",
          ],
          order: "asc",
          type: "alphabetical",
        },
      ],
      "perfectionist/sort-imports": ["error", { newlinesBetween: "ignore", type: "natural" }],
      "perfectionist/sort-modules": "off",
      "unicorn/import-style": ["error", { styles: { "node:path": { named: true } } }],
      "unicorn/no-await-expression-member": "off",
      "unicorn/no-null": "off",
      "unicorn/prefer-module": "warn",
      "unicorn/prevent-abbreviations": "off",
    },
    settings: {
      "import/parsers": { "@typescript-eslint/parser": [".ts"] },
      "import/resolver": { typescript: { alwaysTryTypes: true } },
    },
  },
  // endregion
);

export default config as Linter.Config;
