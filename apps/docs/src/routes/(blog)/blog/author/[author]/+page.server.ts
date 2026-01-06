import { error } from "@sveltejs/kit";
import { getBlogAuthors, getPostsByAuthor } from "$lib/content/blog";
import type { EntryGenerator, PageServerLoad } from "./$types.js";

export const prerender = true;

export const entries = async function entries() {
  const authors = await getBlogAuthors();
  return Array.from(authors.values()).map(({ author }) => ({
    author: encodeURIComponent(author.name),
  }));
} satisfies EntryGenerator;

export const load = async function load({ params }) {
  const authorName = decodeURIComponent(params.author);
  const posts = getPostsByAuthor(authorName);
  const authors = await getBlogAuthors();
  const authorInfo = authors.get(authorName.toLowerCase());

  if (posts.length === 0 || !authorInfo) {
    error(404, { message: `No posts found by author "${authorName}"` });
  }

  return {
    authorName,
    author: authorInfo.author,
    posts,
  };
} satisfies PageServerLoad;
