import { json } from "@sveltejs/kit";
import { getAllSeries, type SeriesInfo } from "$lib/content/blog.js";
import type { RequestHandler } from "./$types.js";

export const prerender = true;
export const trailingSlash = "never";

export const GET = async function GET({ url }) {
  const allSeries = getAllSeries();
  const baseUrl = url.origin;

  const seriesList = allSeries.map((item) => summarizeSeries(item));

  const response: SeriesListingResponse = {
    type: "series-listing",
    series: seriesList,
    total: seriesList.length,
    links: {
      html: `${baseUrl}/blog/series`,
      json: `${baseUrl}/blog/series.json`,
    },
  };

  return json(response, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Link: `<${response.links.html}>; rel="alternate"; type="text/html"`,
    },
  });
} satisfies RequestHandler;

function summarizeSeries({
  count,
  description,
  name,
  posts,
  slug,
}: SeriesInfo): SeriesSummary {
  return {
    name,
    slug,
    description,
    postCount: count,
    posts: posts.map(({ metadata, slug: postSlug, urlSlug }) => ({
      slug: postSlug,
      urlSlug,
      title: metadata.title,
      order: metadata.seriesOrder,
    })),
  };
}

type SeriesSummary = {
  name: string;
  slug: string;
  description?: string;
  postCount: number;
  posts: Array<{
    slug: string;
    urlSlug: string;
    title: string;
    order?: number;
  }>;
};

type SeriesListingResponse = {
  type: "series-listing";
  series: SeriesSummary[];
  total: number;
  links: {
    html: string;
    json: string;
  };
};
