import { createContext } from "$lib/trpc/context";
import { createCaller } from "$lib/trpc/router";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
  const caller = createCaller(await createContext(event));
  const page = parseInt(event.url.searchParams.get("page") || "1", 10);
  const authors = await caller.creators.list({ page });

  return { authors };
};
