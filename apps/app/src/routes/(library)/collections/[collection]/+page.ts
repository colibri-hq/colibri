import { trpc } from "$lib/trpc/client";
import type { PageLoad } from "./$types";

export const load: PageLoad = async function load(event) {
  const router = trpc(event);
  const collectionId = event.params.collection;
  // collection is loaded from +page.server.ts with 404 handling
  const comments = router.collections.loadComments
    .query(collectionId)
    .catch(() => []);
  const works = router.collections.loadBooks
    .query(collectionId)
    .catch(() => []);

  event.depends("trpc:comments.loadComments", "trpc:collections.load");

  return {
    ...event.data,
    comments,
    works,
  };
};
