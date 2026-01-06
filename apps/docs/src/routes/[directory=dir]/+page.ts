import type { PageLoad } from "./$types.js";
import { getSiblingPages } from "$lib/content/content";

export const load = function load({ data }) {
  const { indexPage, ...rest } = data;
  const siblings = indexPage ? getSiblingPages(indexPage.slug) : undefined;

  return {
    ...rest,
    indexContent: indexPage?.content,
    indexMetadata: indexPage?.metadata,
    siblings,
  };
} satisfies PageLoad;
