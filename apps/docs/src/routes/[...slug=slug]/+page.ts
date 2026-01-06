import type { PageLoad } from "./$types.js";
import { getPage, getParentInfo, getSiblingPages } from "$lib/content/content";
import { error } from "@sveltejs/kit";

export const load = function load({ data }) {
  const page = getPage(data.slug);

  if (!page) {
    error(404, { message: "Page not found" });
  }

  const parent = getParentInfo(page.slug);
  const siblings = getSiblingPages(page.slug);

  return {
    content: page.content,
    metadata: page.metadata,
    slug: page.slug,
    parent,
    siblings,
  };
} satisfies PageLoad;
