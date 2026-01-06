import { error, json } from "@sveltejs/kit";
import {
  getAvailableMonthsForYear,
  getAvailableYears,
  getPostsByYearAndMonth,
  MONTH_NAMES,
} from "$lib/content/blog.js";
import type { EntryGenerator, RequestHandler } from "./$types.js";

export const prerender = true;
export const trailingSlash = "never";

export const entries = function entries() {
  const entries: Array<{ year: string; month: string }> = [];

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

export const GET = async function GET({ params, url }) {
  const year = parseInt(params.year, 10);
  const month = parseInt(params.month, 10);
  const monthName = MONTH_NAMES[month - 1]!;
  const baseUrl = url.origin;

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    error(400, "Invalid year or month");
  }

  const posts = getPostsByYearAndMonth(year, month);

  if (posts.length === 0) {
    error(404, `No posts found for ${monthName} ${year}`);
  }

  const monthStr = String(month).padStart(2, "0");

  const postSummaries = posts.map(
    ({ metadata, slug, urlSlug }): PostSummary => ({
      slug: slug,
      urlSlug: urlSlug,
      title: metadata.title,
      description: metadata.description,
      date: metadata.date,
      author: metadata.author,
      tags: metadata.tags ?? [],
      links: {
        html: `${baseUrl}/blog/${urlSlug}`,
        json: `${baseUrl}/blog/${urlSlug}.json`,
        markdown: `${baseUrl}/blog/${urlSlug}.md`,
      },
    }),
  );

  const response: MonthArchiveResponse = {
    type: "blog-archive-month",
    year,
    month,
    monthName,
    posts: postSummaries,
    total: posts.length,
    links: {
      self: {
        html: `${baseUrl}/blog/archive/${year}/${monthStr}`,
        json: `${baseUrl}/blog/archive/${year}/${monthStr}.json`,
      },
      year: {
        html: `${baseUrl}/blog/archive/${year}`,
        json: `${baseUrl}/blog/archive/${year}.json`,
      },
      archive: {
        html: `${baseUrl}/blog/archive`,
        json: `${baseUrl}/blog/archive.json`,
      },
      blog: {
        html: `${baseUrl}/blog`,
        json: `${baseUrl}/blog.json`,
      },
    },
  };

  // Add adjacent month links
  const years = getAvailableYears();
  const allMonths: Array<{ year: number; month: number }> = [];

  for (const year of years) {
    for (const month of getAvailableMonthsForYear(year)) {
      allMonths.push({ year, month });
    }
  }

  const currentIndex = allMonths.findIndex(
    ({ month: currentMonth, year: currentYear }) =>
      currentYear === year && currentMonth === month,
  );
  const prev = currentIndex > 0 ? allMonths[currentIndex - 1] : undefined;
  const next =
    currentIndex !== -1 && currentIndex < allMonths.length - 1
      ? allMonths[currentIndex + 1]
      : undefined;

  if (prev || next) {
    response.links.adjacent = {};

    if (prev) {
      const prevMonthStr = String(prev.month).padStart(2, "0");

      response.links.adjacent.previous = {
        year: prev.year,
        month: prev.month,
        monthName: MONTH_NAMES[prev.month - 1] ?? "",
        html: `${baseUrl}/blog/archive/${prev.year}/${prevMonthStr}`,
        json: `${baseUrl}/blog/archive/${prev.year}/${prevMonthStr}.json`,
      };
    }

    if (next) {
      const nextMonthStr = String(next.month).padStart(2, "0");

      response.links.adjacent.next = {
        year: next.year,
        month: next.month,
        monthName: MONTH_NAMES[next.month - 1] ?? "",
        html: `${baseUrl}/blog/archive/${next.year}/${nextMonthStr}`,
        json: `${baseUrl}/blog/archive/${next.year}/${nextMonthStr}.json`,
      };
    }
  }

  return json(response, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Link: `<${response.links.self.html}>; rel="alternate"; type="text/html"`,
    },
  });
} satisfies RequestHandler;

type PostSummary = {
  slug: string;
  urlSlug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  tags: string[];
  links: {
    html: string;
    json: string;
    markdown: string;
  };
};

type MonthArchiveResponse = {
  type: "blog-archive-month";
  year: number;
  month: number;
  monthName: string;
  posts: PostSummary[];
  total: number;
  links: {
    self: {
      html: string;
      json: string;
    };
    year: {
      html: string;
      json: string;
    };
    archive: {
      html: string;
      json: string;
    };
    blog: {
      html: string;
      json: string;
    };
    adjacent?: {
      previous?: {
        year: number;
        month: number;
        monthName: string;
        html: string;
        json: string;
      };
      next?: {
        year: number;
        month: number;
        monthName: string;
        html: string;
        json: string;
      };
    };
  };
};
