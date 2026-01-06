import {
  getAvailableMonthsForYear,
  getAvailableYears,
  getMonthName,
  getPostsByYearAndMonth,
} from "$lib/content/blog";
import type { EntryGenerator, PageServerLoad } from "./$types.js";

export const prerender = true;

export const entries = function entries() {
  const entries: { year: string; month: string }[] = [];

  for (const year of getAvailableYears()) {
    for (const month of getAvailableMonthsForYear(year)) {
      entries.push({
        year: String(year),
        month: String(month).padStart(2, "0"),
      });
    }
  }

  return entries;
} satisfies EntryGenerator;

export const load = async function load({ params }) {
  const year = parseInt(params.year, 10);
  const month = parseInt(params.month, 10);
  const posts = getPostsByYearAndMonth(year, month);

  return {
    year,
    month,
    monthName: getMonthName(month - 1),
    posts,
  };
} satisfies PageServerLoad;
