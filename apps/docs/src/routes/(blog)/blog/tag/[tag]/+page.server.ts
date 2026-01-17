import { getBlogTags, getPostsByTag } from "$lib/content/blog";
import { error } from "@sveltejs/kit";
import type { EntryGenerator, PageServerLoad } from "./$types.js";

export const prerender = true;

export const entries = function entries() {
  const tags = getBlogTags();

  return Array.from(tags.keys()).map((tag) => ({ tag: encodeURIComponent(tag) }));
} satisfies EntryGenerator;

export const load = async function load({ params }) {
  const tag = decodeURIComponent(params.tag);
  const posts = getPostsByTag(tag);

  if (posts.length === 0) {
    error(404, { message: `No posts found with tag "${tag}"` });
  }

  return { tag, posts };
} satisfies PageServerLoad;
