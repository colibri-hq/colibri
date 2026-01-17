import { getAllPages } from "$lib/content/content.js";
import type { EntryGenerator, PageServerLoad } from "./$types.js";

export const prerender = true;

// Exclude blog posts - they're handled by dedicated /blog/[slug] routes
export const entries: EntryGenerator = () => {
  return Array.from(getAllPages().keys())
    .filter((slug) => !slug.startsWith("/blog/"))
    .map((slug) => ({ slug: slug.replace(/^\//, "") }));
};

export const load = function load({ params: { slug } }) {
  return { slug };
} satisfies PageServerLoad;
