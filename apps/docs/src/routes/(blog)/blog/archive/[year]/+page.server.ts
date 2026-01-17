import { getAvailableYears, getPostsByYear } from "$lib/content/blog";
import type { EntryGenerator, PageServerLoad } from "./$types.js";

export const prerender = true;

export const entries: EntryGenerator = () => {
  const years = getAvailableYears();
  return years.map((year) => ({ year: String(year) }));
};

export const load: PageServerLoad = async ({ params }) => {
  const year = parseInt(params.year, 10);
  const posts = getPostsByYear(year);

  return { year, posts };
};
