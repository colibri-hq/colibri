import { trpc } from "$lib/trpc/client";
import type { PageLoad } from "./$types";

export const load = async function load(event) {
  const seriesId = event.params.series;
  const router = trpc(event);
  // series is loaded from +page.server.ts with 404 handling
  const works = router.series.getWorks.query({ seriesId });

  return {
    ...event.data, // Pass through server data (series)
    works,
  };
} satisfies PageLoad;
