import { getContentTree } from "$lib/content/content.js";
import type { PageServerLoad } from "./$types.js";

export const prerender = true;

export const load = function load() {
  const sections = getContentTree();

  return { sections };
} satisfies PageServerLoad;
