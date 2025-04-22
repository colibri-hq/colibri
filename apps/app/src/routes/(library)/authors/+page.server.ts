import { createContext } from '$lib/trpc/context';
import { createCaller } from '$lib/trpc/router';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
  const caller = createCaller(await createContext(event));
  const query = event.url.searchParams.get('q') || undefined;
  const authors = await caller.authors.list(query);

  return {
    authors,
  };
};
