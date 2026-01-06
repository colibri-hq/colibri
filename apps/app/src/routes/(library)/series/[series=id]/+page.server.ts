import { createContext } from "$lib/trpc/context";
import { router } from "$lib/trpc/router";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load = async function load(event) {
  const caller = router.createCaller(await createContext(event));
  const { series: id } = event.params;

  try {
    const series = await caller.series.get({ id });
    return { series };
  } catch {
    throw error(404, "Series not found");
  }
} satisfies PageServerLoad;
