import { includeIgnoreFile } from '@eslint/compat';
// @ts-expect-error -- no types for eslint-config-oclif
import oclif from 'eslint-config-oclif';
import prettier from 'eslint-config-prettier';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const gitignorePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.gitignore');

export default [
  includeIgnoreFile(gitignorePath),
  ...oclif,
  prettier,
  {
    rules: {
      camelcase: ['error', { properties: 'never' }],
      'perfectionist/sort-imports': ['error', {
        newlinesBetween: 'never',
        type: 'natural',
      }],
    },
  },
];
