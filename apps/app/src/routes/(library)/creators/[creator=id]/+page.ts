import { trpc } from "$lib/trpc/client";
import type { PageLoad } from "./$types";

export const load = async function load(event) {
  const id = event.params.creator;
  const router = trpc(event);
  // creator is loaded from +page.server.ts with 404 handling
  const contributions = router.creators.loadContributions.query({ id });

  return {
    ...event.data, // Pass through server data (creator)
    contributions,
  };
} satisfies PageLoad;
