import type { PageLoad } from "./$types.js";
import { getAllPages, type Page } from "$lib/content/content";
import { error } from "@sveltejs/kit";

export const load = function load({ data }) {
  const { tag } = data;

  // Find all pages that have this tag
  const pages: Page[] = [];
  for (const page of getAllPages().values()) {
    if (page.metadata.tags?.includes(tag)) {
      pages.push(page);
    }
  }

  if (pages.length === 0) {
    error(404, { message: `No pages found with tag "${tag}"` });
  }

  // Sort pages by title
  pages.sort((a, b) => a.metadata.title.localeCompare(b.metadata.title));

  return {
    tag,
    pages: pages.map((page) => ({
      title: page.metadata.title,
      description: page.metadata.description,
      href: page.slug,
    })),
  };
} satisfies PageLoad;
