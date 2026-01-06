import { createContext } from "$lib/trpc/context";
import { router } from "$lib/trpc/router";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load = async function load(event) {
  const caller = router.createCaller(await createContext(event));
  const { author: id } = event.params;

  try {
    const author = await caller.creators.load({ id });
    const works = caller.creators.loadContributions({ id });

    return { author, works };
  } catch {
    throw error(404, "Author not found");
  }
} satisfies PageServerLoad;
