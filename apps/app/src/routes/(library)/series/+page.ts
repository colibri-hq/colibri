import { extractPaginationParametersFromUrl, trpc } from "$lib/trpc/client";
import type { PageLoad } from "./$types";

export const load = async function load(event) {
  const options = extractPaginationParametersFromUrl(event.url);
  const series = await trpc(event).series.list.query(options);

  return { series };
} satisfies PageLoad;
