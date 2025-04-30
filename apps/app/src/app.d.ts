// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import type { Database } from "@colibri-hq/sdk";
import type { CompositionEventHandler } from "svelte/elements";

declare global {
  namespace App {
    interface Error {
      title?: string;
      code?: string;
      message?: string;
    }

    interface Locals {
      database: Database;
    }

    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }

  declare namespace svelteHTML {
    interface HTMLAttributes<T> {
      onClickOutside?: CompositionEventHandler<T>;
    }
  }

  declare const PACKAGE_REPOSITORY_URL: string;
  declare const PACKAGE_HOMEPAGE_URL: string;
  declare const PACKAGE_BUGS_URL: string;
}

export {};
