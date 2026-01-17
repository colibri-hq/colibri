import { trpc } from "$lib/trpc/client";
import type { PageLoad } from "./$types";

export const load = async function load(event) {
  const query = event.url.searchParams.get("q") || undefined;
  const publishers = await trpc(event).publishers.list.query(query);

  return { publishers };
} satisfies PageLoad;
