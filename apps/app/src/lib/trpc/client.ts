import { browser } from "$app/environment";
import type { Router } from "$lib/trpc/router";
import { createTRPCClient, type TRPCClientInit } from "trpc-sveltekit";

let browserClient: ReturnType<typeof createTRPCClient<Router>>;

export function trpc(init: TRPCClientInit) {
  if (browser && browserClient) {
    return browserClient;
  }

  const client = createTRPCClient<Router>({
    init,
  });

  if (browser) {
    browserClient = client;
  }

  return client;
}

export function savable<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      if (typeof value === "string") {
        const adjustedValue = value.trim();

        return [key, adjustedValue === "" ? null : adjustedValue];
      }

      return [key, value];
    }),
  ) as T;
}

export function extractPaginationParametersFromUrl(
  url: URL,
  defaultPerPage = 10,
  defaultPage = 1,
) {
  const page = Number(url.searchParams.get("page") || defaultPage);
  const perPage = Number(url.searchParams.get("per_page") || defaultPerPage);

  return {
    page: isNaN(page) ? defaultPage : page,
    perPage: isNaN(perPage) ? defaultPerPage : perPage,
  };
}

export function removePaginationParametersFromUrl(url: URL) {
  url.searchParams.delete("page");
  url.searchParams.delete("per_page");

  return url;
}

export type PaginationData = {
  page: string | number | bigint;
  last_page: string | number | bigint;
  per_page: string | number | bigint;
  total: string | number | bigint;
};
