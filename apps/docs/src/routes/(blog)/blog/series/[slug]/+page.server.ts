import { error } from "@sveltejs/kit";
import type { EntryGenerator, PageServerLoad } from "./$types.js";
import { getAllSeriesSlugs, getSeriesBySlug } from "$lib/content/blog";

export const prerender = true;

export const entries = function entries() {
  return getAllSeriesSlugs().map((slug) => ({ slug }));
} satisfies EntryGenerator;

export const load = function load({ params }) {
  const series = getSeriesBySlug(params.slug);

  if (!series) {
    error(404, `Series not found: ${params.slug}`);
  }

  return { series };
} satisfies PageServerLoad;
