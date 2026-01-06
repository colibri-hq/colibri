import { getBlogPosts, getFeaturedPosts } from "$lib/content/blog";
import type { PageServerLoad } from "./$types.js";

export const prerender = true;

export const load = async function load() {
  const posts = getBlogPosts();
  const featured = getFeaturedPosts();

  return { posts, featured };
} satisfies PageServerLoad;
