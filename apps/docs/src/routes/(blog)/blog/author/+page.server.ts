import { getBlogAuthors } from "$lib/content/blog";
import type { PageServerLoad } from "./$types.js";

export const prerender = true;

export const load = async function load() {
  const authorsMap = await getBlogAuthors();
  const authors = Array.from(authorsMap.values());

  return { authors };
} satisfies PageServerLoad;
