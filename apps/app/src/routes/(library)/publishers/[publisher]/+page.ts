import { trpc } from '$lib/trpc/client';
import type { PageLoad } from './$types';

export const load = async function load(event) {
  const publisher = await trpc(event).publishers.load.query(
    event.params.publisher,
  );
  const books = trpc(event).publishers.loadBooksForPublisher.query(
    publisher.id,
  );
  const creators = trpc(event).publishers.loadCreatorsForPublisher.query(
    publisher.id,
  );

  return {
    publisher,
    creators,
    books,
  };
} satisfies PageLoad;
