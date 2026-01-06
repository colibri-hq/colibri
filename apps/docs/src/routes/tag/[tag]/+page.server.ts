import { getAllPages } from "$lib/content/content.js";
import type { EntryGenerator, PageServerLoad } from "./$types.js";

export const prerender = true;

/**
 * Collects all unique tags from all pages for prerendering.
 */
export const entries: EntryGenerator = () => {
  const tags = new Set<string>();

  for (const page of getAllPages().values()) {
    if (page.metadata.tags) {
      for (const tag of page.metadata.tags) {
        tags.add(tag);
      }
    }
  }

  return Array.from(tags).map((tag) => ({ tag }));
};

export const load = function load({ params: { tag } }) {
  return { tag };
} satisfies PageServerLoad;
