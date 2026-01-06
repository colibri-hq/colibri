import {
  type Directory,
  getContentTree,
  isDirectory,
  isPage,
  type Page,
} from "$lib/content/content";
import {
  getAllSeries,
  getAvailableYears,
  getBlogAuthors,
  getBlogPosts,
  getBlogTags,
} from "$lib/content/blog";
import type { PageServerLoad } from "./$types.js";

export const prerender = true;

export type SitemapPage = {
  title: string;
  href: string;
  description?: string;
};

export type SitemapSection = {
  title: string;
  href?: string;
  pages: SitemapPage[];
  subsections?: SitemapSection[];
};

function extractPages(item: Page | Directory): SitemapSection {
  if (isPage(item)) {
    return {
      title: item.metadata.title,
      href: item.slug,
      pages: [],
    };
  }

  // Directory
  const pages: SitemapPage[] = [];
  const subsections: SitemapSection[] = [];

  for (const child of item.children) {
    if (isPage(child)) {
      pages.push({
        title: child.metadata.title,
        href: child.slug,
        description: child.metadata.description,
      });
    } else if (isDirectory(child)) {
      subsections.push(extractPages(child));
    }
  }

  return {
    title: item.title,
    href: item.indexPage?.slug,
    pages,
    subsections: subsections.length > 0 ? subsections : undefined,
  };
}

export const load = async function load() {
  const contentTree = getContentTree();

  // Extract documentation sections
  const docSections: SitemapSection[] = [];
  const topLevelPages: SitemapPage[] = [];

  for (const item of contentTree) {
    if (isPage(item)) {
      topLevelPages.push({
        title: item.metadata.title,
        href: item.slug,
        description: item.metadata.description,
      });
    } else if (isDirectory(item)) {
      docSections.push(extractPages(item));
    }
  }

  // Get blog posts grouped by year
  const blogPosts = getBlogPosts();
  const postsByYear = new Map<number, SitemapPage[]>();

  for (const post of blogPosts) {
    const year = new Date(post.metadata.date).getFullYear();
    if (!postsByYear.has(year)) {
      postsByYear.set(year, []);
    }
    postsByYear.get(year)!.push({
      title: post.metadata.title,
      href: `/blog/${post.urlSlug}`,
      description: post.metadata.description,
    });
  }

  // Convert to sorted array
  const blogByYear = Array.from(postsByYear.entries())
    .sort(([a], [b]) => b - a)
    .map(([year, pages]) => ({
      year,
      pages,
    }));

  // Get all series
  const series = getAllSeries().map((s) => ({
    title: s.name,
    href: `/blog/series/${s.slug}`,
    count: s.posts.length,
  }));

  // Get all tags with counts
  const tagsMap = getBlogTags();
  const tags = Array.from(tagsMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      href: `/blog/tag/${name}`,
      name,
      count,
    }));

  // Get all authors with counts
  const authorsMap = await getBlogAuthors();
  const authors = Array.from(authorsMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .map(([_, info]) => ({
      name: info.author.name,
      href: `/blog/author/${encodeURIComponent(info.author.name)}`,
      count: info.count,
    }));

  // Get archive years
  const archiveYears = getAvailableYears().map((year) => ({
    year,
    href: `/blog/archive/${year}`,
  }));

  return {
    topLevelPages,
    docSections,
    blogByYear,
    series,
    tags,
    authors,
    archiveYears,
    totalBlogPosts: blogPosts.length,
  };
} satisfies PageServerLoad;
