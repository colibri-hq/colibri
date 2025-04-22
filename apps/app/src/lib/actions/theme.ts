import type { Action } from 'svelte/action';
import { derived, writable } from 'svelte/store';
import type { AuthenticationColorScheme } from '../../database';

interface ThemeOptions {
  colorScheme: 'dark' | 'light' | undefined;
}

export const preference = writable<AuthenticationColorScheme>('system');
const internalThemeOptions = writable<ThemeOptions>({
  colorScheme: undefined,
});
export const themeOptions = derived(
  internalThemeOptions,
  ($internalThemeOptions) => $internalThemeOptions,
);

/**
 * Sets the color scheme based on the user's preference.
 *
 * @param node
 */
export const theme: Action = function theme(node) {
  const root = node.ownerDocument.documentElement;
  const query = window.matchMedia('(prefers-color-scheme: dark)');
  const mediaQueryListener = ({ matches }: MediaQueryListEvent) => {
    internalThemeOptions.set({ colorScheme: matches ? 'dark' : 'light' });
  };

  internalThemeOptions.subscribe(({ colorScheme }: ThemeOptions) => {
    if (!colorScheme) {
      delete root.dataset.colorScheme;

      return;
    }

    root.dataset.colorScheme = colorScheme;
  });

  preference.subscribe((value) => {
    if (value === 'system') {
      internalThemeOptions.set({
        colorScheme: query.matches ? 'dark' : 'light',
      });
      query.addEventListener('change', mediaQueryListener);

      return;
    }

    internalThemeOptions.set({ colorScheme: value });
    query.removeEventListener('change', mediaQueryListener);
  });

  return {
    destroy() {
      query.removeEventListener('change', mediaQueryListener);
      internalThemeOptions.set({ colorScheme: undefined });
      // delete root.dataset.colorScheme;
    },
  };
};
