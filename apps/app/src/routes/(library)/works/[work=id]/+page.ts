import { trpc } from "$lib/trpc/client";
import type { PageLoad } from "./$types";

export const load: PageLoad = async function load(event) {
  const workId = event.params.work;
  const router = trpc(event);
  const work = await router.books.load.query(workId);
  const creators = router.books.loadCreators.query({ workId });
  const publisher = router.books.loadPublisher.query({ workId });
  const ratings = router.books.loadRatings.query({ workId });
  const reviews = router.books.loadReviews.query({ workId });

  return { work, creators, publisher, ratings, reviews };
};
