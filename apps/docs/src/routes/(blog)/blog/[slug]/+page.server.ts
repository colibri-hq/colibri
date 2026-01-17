import { getAuthorWithGravatar } from "$lib/content/author";
import {
  getAdjacentPosts,
  getBlogPost,
  getBlogPosts,
  getRelatedPosts,
  getSeriesPosts,
} from "$lib/content/blog";
import { error } from "@sveltejs/kit";
import type { EntryGenerator, PageServerLoad } from "./$types.js";

export const prerender = true;

export const entries = function entries() {
  const posts = getBlogPosts();
  return posts.map((post) => ({ slug: post.urlSlug }));
} satisfies EntryGenerator;

export const load = async function load({ params }) {
  const post = getBlogPost(params.slug);

  if (!post) {
    error(404, { message: "Blog post not found" });
  }

  const adjacent = getAdjacentPosts(post.urlSlug);
  const author = await getAuthorWithGravatar(post.metadata.author, 64);

  // Get series posts if this is part of a series
  const seriesPosts = post.metadata.series ? getSeriesPosts(post.metadata.series) : [];

  // Get related posts based on shared tags
  const relatedPosts = getRelatedPosts(post, 3);

  return { post, author, adjacent, seriesPosts, relatedPosts };
} satisfies PageServerLoad;
