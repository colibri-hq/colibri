import svelte from 'eslint-plugin-svelte';
import js from '@eslint/js';
import ts from 'typescript-eslint';
//import tailwind from 'eslint-plugin-tailwindcss';
import type { Linter } from 'eslint';
import prettier from 'eslint-config-prettier';
import { browser } from 'globals';
import svelteConfig from './svelte.config.js';

export default ts.config([
  // region Ignored Files
  {
    ignores: ['.svelte-kit/**/*', 'node_modules/**/*', 'build/**/*', 'dist/**/*'],
  } satisfies Linter.Config,
  // endregion

  // region Plugin and Preset Configs
  js.configs.recommended,
  ts.configs.recommended,
  ...svelte.configs.recommended,
  ...svelte.configs.prettier,
  // ...tailwind.configs['flat/recommended'],
  prettier,
  // endregion

  // region TypeScript Code
  {
    files: ['src/**/*.ts'],
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
