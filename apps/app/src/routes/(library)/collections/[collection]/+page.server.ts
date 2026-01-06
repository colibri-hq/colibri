import { createContext } from "$lib/trpc/context";
import { router } from "$lib/trpc/router";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load = async function load(event) {
  const caller = router.createCaller(await createContext(event));
  const { collection: id } = event.params;

  try {
    const collection = await caller.collections.load(id);
    return { collection };
  } catch {
    throw error(404, "Collection not found");
  }
} satisfies PageServerLoad;
