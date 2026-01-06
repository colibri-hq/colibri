import { createContext } from "$lib/trpc/context";
import { router } from "$lib/trpc/router";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load = async function load(event) {
  const caller = router.createCaller(await createContext(event));
  const { publisher: id } = event.params;

  try {
    const publisher = await caller.publishers.load(id);
    return { publisher };
  } catch {
    throw error(404, "Publisher not found");
  }
} satisfies PageServerLoad;
