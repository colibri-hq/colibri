import { trpc } from '$lib/trpc/client';
import type { PageLoad } from './$types';

export const load: PageLoad = async function load(event) {
  const bookId = event.params.book;
  const router = trpc(event);
  const book = await router.books.load.query(bookId);
  const creators = router.books.loadCreators.query({ bookId });
  const publisher = router.books.loadPublisher.query({ bookId });
  const ratings = router.books.loadRatings.query({ bookId });
  const reviews = router.books.loadReviews.query({ bookId });

  return { book, creators, publisher, ratings, reviews };
};
