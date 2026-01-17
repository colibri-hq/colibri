// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    interface Error {
      title?: string;
      code?: string;
      message?: string;
    }

    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }

  declare namespace svelteHTML {
    // interface HTMLAttributes<_T> {}
  }

  declare const PACKAGE_REPOSITORY_URL: string;
  declare const PACKAGE_HOMEPAGE_URL: string;
  declare const PACKAGE_BUGS_URL: string;
  declare const CONTENT_ROOT_DIR: string;
  declare const CONTENT_ROOT_REPOSITORY_PATH: string;
}

export {};
