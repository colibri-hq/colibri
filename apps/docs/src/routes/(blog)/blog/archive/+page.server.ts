import { getBlogPosts, MONTH_NAMES } from "$lib/content/blog";
import type { PageServerLoad } from "./$types.js";

export const prerender = true;

export type ArchiveYear = { year: number; months: ArchiveMonth[] };

export type ArchiveMonth = { month: number; monthName: string; posts: ArchivePost[] };

export type ArchivePost = { title: string; urlSlug: string; date: string; day: number };

export const load: PageServerLoad = () => {
  const posts = getBlogPosts();

  if (posts.length === 0) {
    return { years: [], totalPosts: 0 };
  }

  // Normalize ISO date to YYYY-MM-DD
  const normalizeDate = (rawDate: string) =>
    rawDate.includes("T") ? rawDate.split("T")[0]! : rawDate;

  // Group posts by year and month
  const yearMap = new Map<number, Map<number, ArchivePost[]>>();

  for (const { metadata, urlSlug } of posts) {
    const date = normalizeDate(metadata.date);
    const [year, month, day] = date.split("-").map(Number) as [number, number, number];

    if (!yearMap.has(year)) {
      yearMap.set(year, new Map());
    }

    const monthMap = yearMap.get(year)!;

    if (!monthMap.has(month)) {
      monthMap.set(month, []);
    }

    monthMap.get(month)!.push({ title: metadata.title, urlSlug, date, day });
  }

  // Convert to sorted array structure (newest first)
  const years: ArchiveYear[] = [];

  const sortedYears = Array.from(yearMap.keys()).toSorted((a, b) => b - a);

  for (const year of sortedYears) {
    const monthMap = yearMap.get(year)!;
    const months: ArchiveMonth[] = [];

    const sortedMonths = Array.from(monthMap.keys()).toSorted((a, b) => b - a);

    for (const month of sortedMonths) {
      const monthPosts = monthMap.get(month)!;

      // Sort posts within month by day (newest first)
      monthPosts.sort(({ day: a }, { day: b }) => b - a);

      months.push({ month, monthName: MONTH_NAMES[month - 1]!, posts: monthPosts });
    }

    years.push({ year, months });
  }

  return { years, totalPosts: posts.length };
};
