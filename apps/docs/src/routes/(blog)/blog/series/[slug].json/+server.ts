import { getAllSeriesSlugs, getSeriesBySlug } from "$lib/content/blog.js";
import { error, json } from "@sveltejs/kit";
import type { EntryGenerator, RequestHandler } from "./$types.js";

export const prerender = true;
export const trailingSlash = "never";

export const entries = function entries() {
  return getAllSeriesSlugs().map((slug) => ({ slug }));
} satisfies EntryGenerator;

export const GET = async function GET({ params: { slug }, url }) {
  const series = getSeriesBySlug(slug);
  const baseUrl = url.origin;

  if (!series) {
    error(404, `Series not found: ${slug}`);
  }

  const response: SeriesDetailResponse = {
    type: "series-detail",
    name: series.name,
    slug: series.slug,
    description: series.description,
    posts: series.posts.map(({ metadata, slug: postSlug, urlSlug }) => ({
      slug: postSlug,
      urlSlug: urlSlug,
      title: metadata.title,
      description: metadata.description,
      date: metadata.date,
      order: metadata.seriesOrder,
    })),
    total: series.count,
    links: {
      html: `${baseUrl}/blog/series/${slug}`,
      json: `${baseUrl}/blog/series/${slug}.json`,
      seriesListing: `${baseUrl}/blog/series.json`,
    },
  };

  return json(response, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Link: `<${response.links.html}>; rel="alternate"; type="text/html"`,
    },
  });
} satisfies RequestHandler;

type SeriesPostInfo = {
  slug: string;
  urlSlug: string;
  title: string;
  description: string;
  date: string;
  order?: number;
};

type SeriesDetailResponse = {
  type: "series-detail";
  name: string;
  slug: string;
  description?: string;
  posts: SeriesPostInfo[];
  total: number;
  links: { html: string; json: string; seriesListing: string };
};
