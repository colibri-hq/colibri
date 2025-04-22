import { createContext } from '$lib/trpc/context';
import { createCaller } from '$lib/trpc/router';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load = async function load(event) {
  const caller = createCaller(await createContext(event));
  const id = event.params.catalog;

  if (!id) {
    throw error(400, 'Missing catalog ID');
  }

  const loadCatalog = () => caller.catalogs.load({ id });

  // TODO: Typing the loadCatalog return directly here is bad, but the router output is broken...
  let catalog: Awaited<ReturnType<typeof loadCatalog>>;

  try {
    catalog = await loadCatalog();
  } catch (cause) {
    console.error('Failed to load catalog', cause);
    throw error(404, 'Catalog not found');
  }

  throw redirect(308, `/discover/${catalog.id}/${catalog.slug}`);
} satisfies PageServerLoad;
