import type { PageLoad } from "./$types";
import { trpc } from "$lib/trpc/client";

export const load: PageLoad = async (event) => {
  const collections = await trpc(event).collections.list.query();

  return { collections };
};
