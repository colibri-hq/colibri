import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import ts from 'typescript-eslint';
// import tailwind from 'eslint-plugin-tailwindcss';
import type { Linter } from 'eslint';
import prettier from 'eslint-config-prettier';
import { browser, node, worker } from 'globals';
import svelteConfig from './svelte.config.js';

export default ts.config([
  // region Ignored Files
  { ignores: ['.svelte-kit/**/*', 'node_modules/**/*'] },
  // endregion

  // region Plugin and Preset Configs
  js.configs.recommended,
  ts.configs.recommended,
  ...svelte.configs.recommended,
  ...svelte.configs.prettier,
  // ...tailwind.configs['flat/recommended'],
  prettier,
  // endregion

  // region CommonJS modules
  {
    files: ['**/*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  // endregion

  // region Test Code
  {
    files: ['tests/**/*.ts', 'tests/**/*.js'],
    languageOptions: {
      globals: {
        ...node,
      },
    },
  },
  // endregion

  // region Worker Modules
  {
    ignores: ['src/**/*.worker.ts', 'src/**/*.worker.js'],
    languageOptions: {
      globals: {
        ...browser,
        ...worker,
        //...node,
      },
    },
  },
  // endregion

  // region All TypeScript Code
  {
    files: ['src/**/*.ts', 'src/**/*.js', 'tests/**/*.ts', 'tests/**/*.js'],
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
    files: ['src/**/*.ts', 'src/**/*.js'],

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
    files: [
      'src/lib/server/**/*.ts',
      'src/lib/server/**/*.js',
      '**/*.server.ts',
      '**/*.server.js',
    ],
    languageOptions: {
      globals: {
        ...browser,
        ...node,
      },
    },
    rules: {
      // Allow console logs on the server
      'no-console': 'off',
    },
  } satisfies Linter.Config,
  // endregion

  // region Svelte Components
  {
    files: ['**/*.svelte'],
    languageOptions: {
      globals: {
        ...browser,
      },
      projectService: true,
      extraFileExtensions: ['.svelte'],
      parserOptions: {
        parser: ts.parser,
        svelteConfig,
      },
    },

    rules: {
      'svelte/no-inline-styles': ['error', { allowTransitions: true }],
    },
  },
  // endregion
]);
