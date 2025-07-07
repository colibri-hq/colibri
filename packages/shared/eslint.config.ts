import js from '@eslint/js';
import type { Config as SvelteConfig } from '@sveltejs/kit';
import svelte from 'eslint-plugin-svelte';
import ts, { type ConfigArray } from 'typescript-eslint';
// import tailwind from 'eslint-plugin-tailwindcss';
import type { Linter } from 'eslint';
import prettier from 'eslint-config-prettier/flat';
import oxlint from 'eslint-plugin-oxlint';
import globals from 'globals';
import { resolve } from 'node:path';

export function config(
  {
    tsconfigRootDir = import.meta.dirname,
    svelteConfig,
    ignores = [],
  }: {
    tsconfigRootDir?: string;
    svelteConfig?: Partial<SvelteConfig>;
    ignores?: string[];
  } = {},
  ...additionalConfigs: Linter.Config[]
): ConfigArray {
  return ts.config([
    // region Ignored Files
    {
      ignores: [
        '.svelte-kit/**/*',
        'node_modules/**/*',
        'dist/**/*',
        '.turbo/**/*',
        '.cache/**/*',
        ...ignores,
      ],
    },
    // endregion

    // region Plugin and Preset Configs
    js.configs.recommended,
    ...ts.configs.recommended,
    ...svelte.configs.recommended,
    prettier,
    ...svelte.configs.prettier,
    // ...tailwind.configs['flat/recommended'],
    // endregion

    // region Global Configs
    {
      rules: { 'no-undef': 'off' },
    },
    // endregion

    // region CommonJS modules
    {
      files: ['**/*.cjs'],
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
      },
    },
    // endregion

    // region Sources
    {
      files: ['src/**/*.ts'],
      ignores: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
      languageOptions: {
        parser: ts.parser,
        parserOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module',
          tsconfigRootDir,
          projectService: true,
        },
      },
    },
    // endregion

    // region Tests
    {
      files: ['tests/**/*.ts', 'src/**/*.test.ts', 'src/**/*.spec.ts'],
      languageOptions: {
        globals: {
          ...globals.node,
        },
        parser: ts.parser,
        parserOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module',
          tsconfigRootDir,
          projectService: {
            defaultProject: resolve(tsconfigRootDir, 'tsconfig.test.json'),
          },
        },
      },
    },
    // endregion

    // region Worker Modules
    {
      ignores: ['src/**/*.worker.ts', 'src/**/*.worker.js'],
      languageOptions: {
        globals: {
          ...globals.browser,
          ...globals.worker,
        },
      },
    },
    // endregion

    // region All TypeScript Code
    {
      files: ['src/**/*.ts', 'tests/**/*.ts', 'src/**/*.svelte'],
      rules: {
        '@typescript-eslint/no-unused-vars': [
          'warn',
          {
            args: 'all',
            argsIgnorePattern: '^_',
            destructuredArrayIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            ignoreRestSiblings: true,
          },
        ],
      },
    },
    // endregion

    // region Client-side only TypeScript Code
    {
      files: ['src/**/*.ts'],

      // Exclude server routes
      ignores: ['src/routes/**/*.ts'],
      rules: {
        // Allow logs in the client, but warn
        'no-console': 'warn',

        // Disable `debugger` entirely
        'no-debugger': 'error',
      },
    },
    // endregion

    // region Server modules
    {
      files: ['src/lib/server/**/*.ts', '**/*.server.ts'],
      languageOptions: {
        globals: {
          ...globals.browser,
          ...globals.node,
        },
      },
      rules: {
        // Allow console logs on the server
        'no-console': 'off',
      },
    },
    // endregion

    // region Svelte Components
    {
      files: ['src/**/*.svelte'],
      languageOptions: {
        globals: {
          ...globals.browser,
        },
        parserOptions: {
          projectService: true,
          parser: ts.parser,
          tsconfigRootDir,
          extraFileExtensions: ['.svelte'],
          svelteConfig,
        },
      },

      rules: {
        'svelte/no-inline-styles': ['error', { allowTransitions: true }],
      },
    },
    // endregion

    ...additionalConfigs,
    ...oxlint.buildFromOxlintConfigFile(
      `${import.meta.dirname}/.oxlintrc.json`,
    ),
  ]);
}

export default config() as ConfigArray;
