import { getContentTree } from "$lib/content/content.js";
import type { LayoutServerLoad } from "./$types.js";

export const load = function load() {
  const contentTree = getContentTree();

  return { contentTree };
} satisfies LayoutServerLoad;
