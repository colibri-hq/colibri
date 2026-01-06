import { trpc } from "$lib/trpc/client";
import type { PageLoad } from "./$types";

export const load: PageLoad = async function load(event) {
  const workId = event.params.work!;
  const router = trpc(event);
  // work is loaded from +page.server.ts with 404 handling
  const creators = router.books.loadCreators.query({ workId });
  const publisher = router.books.loadPublisher.query({ workId });
  const ratings = router.books.loadRatings.query({ workId });
  const reviews = router.books.loadReviews.query({ workId });

  return {
    ...event.data, // Pass through server data (work)
    creators,
    publisher,
    ratings,
    reviews,
  };
};
