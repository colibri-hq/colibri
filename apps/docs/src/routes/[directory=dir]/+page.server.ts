import { Directory, getContentTree } from "$lib/content/content.js";
import type { EntryGenerator, PageServerLoad } from "./$types.js";
import { error } from "@sveltejs/kit";

export const prerender = true;

// Filter to only top-level directories (not pages)
function getTopLevelDirectories(): Directory[] {
  return getContentTree().filter((item): item is Directory => item instanceof Directory);
}

export const entries: EntryGenerator = () =>
  getTopLevelDirectories().map(({ name }) => ({ directory: name }));

export const load = function load({ params: { directory } }) {
  const directories = getTopLevelDirectories();
  const node = directories.find(({ name }) => name === directory);

  if (!node) {
    error(404, `Page not found: ${directory}`);
  }

  return {
    slug: directory,
    title: node.title,
    description: node.indexPage?.metadata.description,
    indexPage: node.indexPage,
    children: node.children,
  };
} satisfies PageServerLoad;
