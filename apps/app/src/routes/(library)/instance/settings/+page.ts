import { extractPaginationParametersFromUrl, trpc } from "$lib/trpc/client";
import type { PageLoad } from "./$types";

export const load = function load(event) {
  const options = extractPaginationParametersFromUrl(event.url);
  const catalogs = trpc(event).catalogs.list.query(options);

  return { catalogs };
} satisfies PageLoad;
