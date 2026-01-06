import type { Component } from "svelte";
import type { Page, PageMetadata } from "./content";
import { getAllPages } from "./content";
import { type AuthorWithGravatar, getAuthorWithGravatar, parseAuthor } from "./author";

/**
 * Extended metadata for blog posts
 */
export type BlogPostMetadata = PageMetadata & {
  /** Must be "blog" for blog posts */
  layout: "blog";
  /** Author in "Name <email@address>" format */
  author: string;
  /** Hero image path (relative to static/) or full URL */
  heroImage?: string;
  /** Alt text for hero image */
  heroAlt?: string;
  /** Custom excerpt (auto-generated from content if not provided) */
  excerpt?: string;
  /** Show in featured section */
  featured?: boolean;
  /** Series name for multi-part posts */
  series?: string;
  /** Order within series (1-based) */
  seriesOrder?: number;
};

/**
 * Blog post with typed metadata
 */
export type BlogPost = {
  __type: "BlogPost";
  slug: string;
  metadata: BlogPostMetadata;
  content: Component;
  /** Slug for URL (without /blog prefix) */
  urlSlug: string;
};

/**
 * Type guard for BlogPost objects.
 * Uses discriminator property to avoid issues across module boundaries.
 */
export function isBlogPost(item: unknown): item is BlogPost {
  return (
    typeof item === "object" &&
    item !== null &&
    "__type" in item &&
    item.__type === "BlogPost"
  );
}

/**
 * Adjacent posts for navigation
 */
export type AdjacentPosts = {
  previous?: BlogPost;
  next?: BlogPost;
};

/**
 * Author info with post count
 */
export type AuthorInfo = {
  author: AuthorWithGravatar;
  count: number;
};

/**
 * Series info with posts
 */
export type SeriesInfo = {
  /** Series name (display name) */
  name: string;
  /** URL-safe slug */
  slug: string;
  /** Number of posts in the series */
  count: number;
  /** Posts in the series, sorted by order */
  posts: BlogPost[];
  /** Description from the first post's description, if available */
  description?: string;
};

// Cache for blog posts
let blogPostsCache: BlogPost[] | null = null;

// Cache for derived computations
let yearMonthCache: Map<number, Map<number, BlogPost[]>> | null = null;
let availableYearsCache: number[] | null = null;

/**
 * Checks if a page is a blog post based on its slug and layout
 */
function isBlogPage(page: Page): boolean {
  return page.slug.startsWith("/blog/") && page.metadata.layout === "blog";
}

/**
 * Converts a Page to a BlogPost
 */
function pageToBlogPost(page: Page): BlogPost {
  // Remove /blog/ prefix for URL slug
  const urlSlug = page.slug.replace(/^\/blog\//, "");

  return {
    __type: "BlogPost",
    slug: page.slug,
    metadata: page.metadata as BlogPostMetadata,
    content: page.content,
    urlSlug,
  };
}

/**
 * Gets all blog posts sorted by date (newest first).
 * Results are cached for performance.
 */
export function getBlogPosts(): BlogPost[] {
  if (blogPostsCache) {
    return blogPostsCache;
  }

  const allPages = getAllPages();
  const posts: BlogPost[] = [];

  for (const page of allPages.values()) {
    if (isBlogPage(page)) {
      posts.push(pageToBlogPost(page));
    }
  }

  // Sort by date descending (newest first)
  posts.sort((a, b) => {
    const dateA = new Date(a.metadata.date).getTime();
    const dateB = new Date(b.metadata.date).getTime();
    return dateB - dateA;
  });

  blogPostsCache = posts;
  return posts;
}

/**
 * Gets a blog post by its URL slug (without /blog/ prefix).
 *
 * @param urlSlug - The URL slug (e.g., "introducing-colibri")
 */
export function getBlogPost(urlSlug: string): BlogPost | undefined {
  const posts = getBlogPosts();

  return posts.find(({ urlSlug: slug }) => slug === urlSlug);
}

/**
 * Gets the latest n blog posts.
 */
export function getLatestPosts(count: number): BlogPost[] {
  return getBlogPosts().slice(0, count);
}

/**
 * Gets featured blog posts (with featured: true in frontmatter).
 */
export function getFeaturedPosts(): BlogPost[] {
  return getBlogPosts().filter((p) => p.metadata.featured);
}

/**
 * Gets blog posts filtered by tag.
 */
export function getPostsByTag(tag: string): BlogPost[] {
  const normalizedTag = tag.toLowerCase();
  return getBlogPosts().filter((p) =>
    p.metadata.tags?.some((t) => t.toLowerCase() === normalizedTag),
  );
}

/**
 * Gets blog posts filtered by author name.
 */
export function getPostsByAuthor(authorName: string): BlogPost[] {
  const normalizedName = authorName.toLowerCase();
  return getBlogPosts().filter((p) => {
    const parsed = parseAuthor(p.metadata.author);
    return parsed.name.toLowerCase() === normalizedName;
  });
}

/**
 * Gets all unique tags from blog posts with their counts.
 * Sorted by count (highest first).
 */
export function getBlogTags(): Map<string, number> {
  const tags = new Map<string, number>();

  for (const post of getBlogPosts()) {
    for (const tag of post.metadata.tags ?? []) {
      const normalized = tag.toLowerCase();
      tags.set(normalized, (tags.get(normalized) ?? 0) + 1);
    }
  }

  // Sort by count descending
  return new Map([...tags.entries()].sort((a, b) => b[1] - a[1]));
}

/**
 * Gets all unique authors from blog posts with their info and counts.
 */
export async function getBlogAuthors(): Promise<Map<string, AuthorInfo>> {
  const authors = new Map<string, AuthorInfo>();

  for (const post of getBlogPosts()) {
    const parsed = await getAuthorWithGravatar(post.metadata.author, 64);
    const key = parsed.name.toLowerCase();
    const existing = authors.get(key);

    if (existing) {
      existing.count++;
    } else {
      authors.set(key, { author: parsed, count: 1 });
    }
  }

  // Sort by count descending
  return new Map(
    [...authors.entries()].sort((a, b) => b[1].count - a[1].count),
  );
}

/**
 * Groups blog posts by year and month.
 * Years and months are sorted in descending order (newest first).
 * Results are cached for performance.
 */
export function getPostsByYearMonth(): Map<number, Map<number, BlogPost[]>> {
  if (yearMonthCache) {
    return yearMonthCache;
  }

  const groups = new Map<number, Map<number, BlogPost[]>>();

  for (const post of getBlogPosts()) {
    const date = new Date(post.metadata.date);
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-11

    if (!groups.has(year)) {
      groups.set(year, new Map());
    }
    const yearGroup = groups.get(year)!;

    if (!yearGroup.has(month)) {
      yearGroup.set(month, []);
    }
    yearGroup.get(month)!.push(post);
  }

  // Sort years descending
  const sortedGroups = new Map(
    [...groups.entries()].sort((a, b) => b[0] - a[0]),
  );

  // Sort months descending within each year
  for (const [year, months] of sortedGroups) {
    sortedGroups.set(
      year,
      new Map([...months.entries()].sort((a, b) => b[0] - a[0])),
    );
  }

  yearMonthCache = sortedGroups;
  return sortedGroups;
}

/**
 * Gets posts in the same series, sorted by series order.
 */
export function getSeriesPosts(seriesName: string): BlogPost[] {
  return getBlogPosts()
    .filter((p) => p.metadata.series === seriesName)
    .sort(
      (a, b) => (a.metadata.seriesOrder ?? 0) - (b.metadata.seriesOrder ?? 0),
    );
}

/**
 * Converts a series name to a URL-safe slug.
 */
export function getSeriesSlug(seriesName: string): string {
  return seriesName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Gets all unique series from blog posts with their info.
 * Sorted by post count (highest first).
 */
export function getAllSeries(): SeriesInfo[] {
  const seriesMap = new Map<string, BlogPost[]>();

  for (const post of getBlogPosts()) {
    const name = post.metadata.series;
    // Only include posts with valid string series names
    if (typeof name === "string" && name.trim()) {
      if (!seriesMap.has(name)) {
        seriesMap.set(name, []);
      }
      seriesMap.get(name)!.push(post);
    }
  }

  const seriesList: SeriesInfo[] = [];

  for (const [name, posts] of seriesMap) {
    // Sort posts by series order
    const sortedPosts = posts.sort(
      (a, b) => (a.metadata.seriesOrder ?? 0) - (b.metadata.seriesOrder ?? 0),
    );

    seriesList.push({
      name,
      slug: getSeriesSlug(name),
      count: posts.length,
      posts: sortedPosts,
      // Use description from first post
      description: sortedPosts[0]?.metadata.description,
    });
  }

  // Sort by count descending
  return seriesList.sort((a, b) => b.count - a.count);
}

/**
 * Gets a series by its URL slug.
 */
export function getSeriesBySlug(slug: string): SeriesInfo | undefined {
  return getAllSeries().find((s) => s.slug === slug);
}

/**
 * Gets all series slugs for static generation.
 */
export function getAllSeriesSlugs(): string[] {
  return getAllSeries().map((s) => s.slug);
}

/**
 * Gets adjacent posts for navigation (previous is newer, next is older).
 */
export function getAdjacentPosts(urlSlug: string): AdjacentPosts {
  const posts = getBlogPosts();
  const index = posts.findIndex((p) => p.urlSlug === urlSlug);

  if (index === -1) {
    return {};
  }

  return {
    // Previous is newer (lower index in date-desc sorted list)
    previous: index > 0 ? posts[index - 1] : undefined,
    // Next is older (higher index)
    next: index < posts.length - 1 ? posts[index + 1] : undefined,
  };
}

/**
 * Generates an excerpt from markdown content.
 * Strips formatting and truncates at word boundary.
 *
 * @param content - Raw markdown content
 * @param maxLength - Maximum excerpt length (default 160)
 */
export function generateExcerpt(
  content: string,
  maxLength: number = 160,
): string {
  // Strip markdown formatting
  const plainText = content
    // Remove frontmatter
    .replace(/^---[\s\S]*?---\s*/m, "")
    // Remove headers
    .replace(/#{1,6}\s+/g, "")
    // Remove bold/italic
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    // Remove links but keep text
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    // Remove images
    .replace(/!\[([^\]]*)]\([^)]+\)/g, "")
    // Remove inline code
    .replace(/`[^`]+`/g, "")
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, "")
    // Remove HTML tags
    .replace(/<[^>]+>/g, "")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();

  if (plainText.length <= maxLength) {
    return plainText;
  }

  // Truncate at word boundary
  const truncated = plainText.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSpace > maxLength * 0.5) {
    return truncated.slice(0, lastSpace) + "...";
  }

  return truncated + "...";
}

/**
 * Month names for display
 */
export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/**
 * Gets month name from 0-indexed month number
 */
export function getMonthName(month: number): string {
  return MONTH_NAMES[month] ?? "";
}

/**
 * Formats a date string for display
 */
export function formatBlogDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Gets blog posts filtered by year.
 */
export function getPostsByYear(year: number): BlogPost[] {
  return getBlogPosts().filter((p) => {
    const postYear = new Date(p.metadata.date).getFullYear();
    return postYear === year;
  });
}

/**
 * Gets blog posts filtered by year and month.
 *
 * @param year - Full year (e.g., 2024)
 * @param month - Month number (1-12)
 */
export function getPostsByYearAndMonth(
  year: number,
  month: number,
): BlogPost[] {
  return getBlogPosts().filter((p) => {
    const date = new Date(p.metadata.date);
    return date.getFullYear() === year && date.getMonth() + 1 === month;
  });
}

/**
 * Gets all months that have blog posts for a given year.
 * Returns months in descending order (newest first).
 * Uses cached year/month data for performance.
 *
 * @param year - Full year (e.g., 2024)
 * @returns Array of month numbers (1-12)
 */
export function getAvailableMonthsForYear(year: number): number[] {
  const yearMonthData = getPostsByYearMonth();
  const monthsMap = yearMonthData.get(year);

  if (!monthsMap) {
    return [];
  }

  // Convert 0-indexed months to 1-indexed and sort descending
  return Array.from(monthsMap.keys())
    .map((m) => m + 1)
    .sort((a, b) => b - a);
}

/**
 * Gets blog posts filtered by specific date (YYYY-MM-DD).
 */
export function getPostsByDate(dateString: string): BlogPost[] {
  return getBlogPosts().filter((p) => p.metadata.date === dateString);
}

/**
 * Gets all years that have blog posts.
 * Returns years in descending order (newest first).
 * Results are cached for performance.
 */
export function getAvailableYears(): number[] {
  if (availableYearsCache) {
    return availableYearsCache;
  }

  const years = new Set<number>();

  for (const post of getBlogPosts()) {
    years.add(new Date(post.metadata.date).getFullYear());
  }

  availableYearsCache = Array.from(years).sort((a, b) => b - a);
  return availableYearsCache;
}

/**
 * Gets all dates that have blog posts.
 * Returns dates in descending order (newest first).
 */
export function getAvailableDates(): string[] {
  const dates = new Set<string>();

  for (const post of getBlogPosts()) {
    dates.add(post.metadata.date);
  }

  return Array.from(dates).sort((a, b) => b.localeCompare(a));
}

/**
 * Clears all blog caches. Used for testing.
 */
export function clearBlogCache(): void {
  blogPostsCache = null;
  yearMonthCache = null;
  availableYearsCache = null;
}

/**
 * Gets posts related to a given post based on shared tags.
 * Excludes the current post and returns up to `limit` posts.
 *
 * @param post - The post to find related posts for
 * @param limit - Maximum number of related posts to return (default 3)
 */
export function getRelatedPosts(post: BlogPost, limit: number = 3): BlogPost[] {
  const postTags = new Set(
    post.metadata.tags?.map((t) => t.toLowerCase()) ?? [],
  );

  if (postTags.size === 0) return [];

  // Score posts by number of shared tags
  const scored = getBlogPosts()
    .filter((p) => p.urlSlug !== post.urlSlug)
    .map((p) => {
      const tags = p.metadata.tags?.map((t) => t.toLowerCase()) ?? [];
      const sharedCount = tags.filter((t) => postTags.has(t)).length;
      return { post: p, score: sharedCount };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ post }) => post);
}
