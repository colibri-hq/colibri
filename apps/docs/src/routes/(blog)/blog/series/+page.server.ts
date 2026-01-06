import { getAllSeries } from "$lib/content/blog";
import type { PageServerLoad } from "./$types.js";

export const prerender = true;

export const load = function load() {
  const series = getAllSeries();
  return { series };
} satisfies PageServerLoad;
