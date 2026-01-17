import { getBlogAuthors, getBlogPosts, getBlogTags, getPostsByYearMonth } from "$lib/content/blog";
import type { LayoutServerLoad } from "./$types.js";

export const prerender = true;

export const load = async function load() {
  const posts = getBlogPosts();
  const postsByYearMonth = getPostsByYearMonth();
  const tags = getBlogTags();
  const authors = await getBlogAuthors();

  // Convert Maps to serializable format for SSR
  const yearMonthData: Record<number, Record<number, number>> = {};

  for (const [year, months] of postsByYearMonth) {
    yearMonthData[year] = {};

    for (const [month, monthPosts] of months) {
      yearMonthData[year][month] = monthPosts.length;
    }
  }

  return {
    totalPosts: posts.length,
    yearMonthCounts: yearMonthData,
    tagCounts: Object.fromEntries(tags),
    authors: Array.from(authors.values()),
  };
} satisfies LayoutServerLoad;
