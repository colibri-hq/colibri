import {
  getAvailableYears,
  getPostsByYear,
  getAvailableMonthsForYear,
  MONTH_NAMES,
} from "$lib/content/blog.js";
import { error, json } from "@sveltejs/kit";
import type { EntryGenerator, RequestHandler } from "./$types.js";

export const prerender = true;
export const trailingSlash = "never";

type PostSummary = {
  slug: string;
  urlSlug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  tags: string[];
};

type MonthSummary = {
  month: number;
  name: string;
  count: number;
  links: { html: string; json: string };
};

type YearArchiveResponse = {
  type: "blog-archive-year";
  year: number;
  months: MonthSummary[];
  posts: PostSummary[];
  total: number;
  links: {
    self: { html: string; json: string };
    archive: { html: string; json: string };
    blog: { html: string; json: string };
    adjacent?: {
      previous?: { year: number; html: string; json: string };
      next?: { year: number; html: string; json: string };
    };
  };
};

export const entries: EntryGenerator = () =>
  getAvailableYears().map((year) => ({ year: String(year) }));

export const GET: RequestHandler = async ({ params, url }) => {
  const year = parseInt(params.year, 10);
  const baseUrl = url.origin;

  if (isNaN(year)) {
    error(400, "Invalid year");
  }

  const posts = getPostsByYear(year);
  if (posts.length === 0) {
    error(404, `No posts found for year: ${year}`);
  }

  const months = getAvailableMonthsForYear(year);
  const years = getAvailableYears();
  const yearIndex = years.indexOf(year);

  const monthSummaries: MonthSummary[] = months.map((month) => {
    const monthPosts = posts.filter((p) => {
      const date = new Date(p.metadata.date);
      return date.getMonth() + 1 === month;
    });
    return {
      month,
      name: MONTH_NAMES[month - 1] ?? "",
      count: monthPosts.length,
      links: {
        html: `${baseUrl}/blog/archive/${year}/${String(month).padStart(2, "0")}`,
        json: `${baseUrl}/blog/archive/${year}/${String(month).padStart(2, "0")}.json`,
      },
    };
  });

  const postSummaries: PostSummary[] = posts.map((p) => ({
    slug: p.slug,
    urlSlug: p.urlSlug,
    title: p.metadata.title,
    description: p.metadata.description,
    date: p.metadata.date,
    author: p.metadata.author,
    tags: p.metadata.tags ?? [],
  }));

  const response: YearArchiveResponse = {
    type: "blog-archive-year",
    year,
    months: monthSummaries,
    posts: postSummaries,
    total: posts.length,
    links: {
      self: {
        html: `${baseUrl}/blog/archive/${year}`,
        json: `${baseUrl}/blog/archive/${year}.json`,
      },
      archive: { html: `${baseUrl}/blog/archive`, json: `${baseUrl}/blog/archive.json` },
      blog: { html: `${baseUrl}/blog`, json: `${baseUrl}/blog.json` },
    },
  };

  // Add adjacent year links
  const prevYear = yearIndex > 0 ? years[yearIndex - 1] : undefined;
  const nextYear = yearIndex < years.length - 1 ? years[yearIndex + 1] : undefined;

  if (prevYear !== undefined || nextYear !== undefined) {
    response.links.adjacent = {};
    if (prevYear !== undefined) {
      response.links.adjacent.previous = {
        year: prevYear,
        html: `${baseUrl}/blog/archive/${prevYear}`,
        json: `${baseUrl}/blog/archive/${prevYear}.json`,
      };
    }
    if (nextYear !== undefined) {
      response.links.adjacent.next = {
        year: nextYear,
        html: `${baseUrl}/blog/archive/${nextYear}`,
        json: `${baseUrl}/blog/archive/${nextYear}.json`,
      };
    }
  }

  return json(response, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Link: `<${response.links.self.html}>; rel="alternate"; type="text/html"`,
    },
  });
};
