import { getBlogTags } from "$lib/content/blog";
import type { PageServerLoad } from "./$types.js";

export const prerender = true;

export const load = function load() {
  const tagsMap = getBlogTags();
  const tags = Array.from(tagsMap.entries()).map(([name, count]) => ({ name, count }));

  return { tags };
} satisfies PageServerLoad;
