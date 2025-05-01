import type { Config } from 'prettier';

export const config = {
  useTabs: false,
  tabWidth: 2,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 80,
  quoteProps: 'as-needed',
  semi: true,
  plugins: [
    'prettier-plugin-svelte',
    'prettier-plugin-organize-imports',
    'prettier-plugin-tailwindcss',
  ],
  overrides: [
    {
      files: '*.svelte',
      options: {
        parser: 'svelte',
      },
    },
  ],
} satisfies Config;

export default config;
