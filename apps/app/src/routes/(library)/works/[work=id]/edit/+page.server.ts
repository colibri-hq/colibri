import { createContext } from "$lib/trpc/context";
import { router } from "$lib/trpc/router";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load = async function load(event) {
  const caller = router.createCaller(await createContext(event));
  const { work: id } = event.params;

  try {
    const work = await caller.books.load(id);
    return { work };
  } catch {
    throw error(404, "Work not found");
  }
} satisfies PageServerLoad;
