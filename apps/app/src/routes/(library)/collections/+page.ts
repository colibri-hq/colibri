import { trpc } from "$lib/trpc/client";
import type { PageLoad } from "./$types";

export const load: PageLoad = async (event) => {
  const collections = await trpc(event).collections.list.query();

  return { collections };
};
