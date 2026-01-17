import {
  getAvailableYears,
  getPostsByYear,
  MONTH_NAMES,
  getAvailableMonthsForYear,
} from "$lib/content/blog.js";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";

export const prerender = true;
export const trailingSlash = "never";

type YearSummary = {
  year: number;
  count: number;
  months: Array<{ month: number; name: string; count: number }>;
  links: { html: string; json: string };
};

type ArchiveResponse = {
  type: "blog-archive";
  years: YearSummary[];
  total: number;
  links: { self: { html: string; json: string }; blog: { html: string; json: string } };
};

export const GET: RequestHandler = async ({ url }) => {
  const baseUrl = url.origin;
  const years = getAvailableYears();

  const yearSummaries: YearSummary[] = years.map((year) => {
    const posts = getPostsByYear(year);
    const months = getAvailableMonthsForYear(year);

    return {
      year,
      count: posts.length,
      months: months.map((month) => {
        const monthPosts = posts.filter((p) => {
          const date = new Date(p.metadata.date);
          return date.getMonth() + 1 === month;
        });
        return { month, name: MONTH_NAMES[month - 1] ?? "", count: monthPosts.length };
      }),
      links: {
        html: `${baseUrl}/blog/archive/${year}`,
        json: `${baseUrl}/blog/archive/${year}.json`,
      },
    };
  });

  const totalPosts = yearSummaries.reduce((sum, y) => sum + y.count, 0);

  const response: ArchiveResponse = {
    type: "blog-archive",
    years: yearSummaries,
    total: totalPosts,
    links: {
      self: { html: `${baseUrl}/blog/archive`, json: `${baseUrl}/blog/archive.json` },
      blog: { html: `${baseUrl}/blog`, json: `${baseUrl}/blog.json` },
    },
  };

  return json(response, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Link: `<${response.links.self.html}>; rel="alternate"; type="text/html"`,
    },
  });
};
