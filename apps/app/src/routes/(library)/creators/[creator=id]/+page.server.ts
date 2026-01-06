import { createContext } from "$lib/trpc/context";
import { router } from "$lib/trpc/router";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load = async function load(event) {
  const caller = router.createCaller(await createContext(event));
  const { creator: id } = event.params;

  try {
    const creator = await caller.creators.load({ id });
    return { creator };
  } catch {
    throw error(404, "Creator not found");
  }
} satisfies PageServerLoad;
