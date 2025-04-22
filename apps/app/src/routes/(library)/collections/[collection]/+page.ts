import { trpc } from '$lib/trpc/client';
import type { PageLoad } from './$types';

export const load: PageLoad = async function load(event) {
  const router = trpc(event);
  const collectionId = event.params.collection;
  const collection = router.collections.load.query(collectionId);
  const comments = router.collections.loadComments
    .query(collectionId)
    .catch(() => []);
  const books = router.collections.loadBooks
    .query(collectionId)
    .catch(() => []);

  event.depends('trpc:comments.loadComments', 'trpc:collections.load');

  return {
    comments,
    books,
    collection: await collection,
  };
};
