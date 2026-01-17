import { trpc } from "$lib/trpc/client";
import type { PageLoad } from "./$types";

export const load = async function load(event) {
  // publisher is loaded from +page.server.ts with 404 handling
  const { publisher } = event.data;
  const works = trpc(event).publishers.loadBooksForPublisher.query(publisher.id);
  const creators = trpc(event).publishers.loadCreatorsForPublisher.query(publisher.id);

  return {
    ...event.data, // Pass through server data
    creators,
    works,
  };
} satisfies PageLoad;
