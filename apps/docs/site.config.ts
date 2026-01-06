import type { SiteConfig } from "statue-ssg/cms/content-processor.js";

export const siteConfig: SiteConfig = {
  // Site general information
  site: {
    name: "Colibri",
    description: "Self-hosted ebook library with metadata enrichment and passwordless authentication",
    url: SITE_URL as `https://${string}` | `http://${string}`,
    author: "Colibri Contributors",
  },

  // Social media links
  social: {
    github: "https://github.com/colibri-hq/colibri",
  },

  // Search configuration
  search: {
    enabled: true,
    placeholder: "Search documentation…",
    noResultsText: "No results found",
    debounceMs: 300,
    minQueryLength: 2,
    maxResults: 10,
    showCategories: true,
    showDates: true,
    showExcerpts: true,
    excerptLength: 30,
  },

  // SEO and meta information
  seo: {
    defaultTitle: "Colibri Documentation",
    titleTemplate: "%s | Colibri Docs",
    defaultDescription:
      "Documentation for Colibri, a self-hosted ebook library with metadata enrichment, collections, and passwordless authentication",
    keywords: [
      "colibri",
      "ebook",
      "library",
      "self-hosted",
      "epub",
      "mobi",
      "opds",
      "metadata",
      "passkeys",
    ],
    ogImage: "/logo.svg",
    twitterCard: "summary_large_image",
  },
};

// Blog configuration
export const blogConfig = {
  title: "Colibri Development Blog",
  description: "Development updates, tutorials, and insights from the Colibri team",
  postsPerPage: 10,
  showFeaturedSection: true,
  enableRss: true,
  rssPath: "/blog/feed.xml",
};

// GitHub repository configuration for "Edit on GitHub" links
export const githubConfig = {
  repo: "colibri-hq/colibri",
  branch: "v3",
  contentPath: "apps/docs/content",
};

// Giscus comments configuration
// Get these values from https://giscus.app after enabling GitHub Discussions
export const giscusConfig = {
  // Repository ID - get from giscus.app configuration
  repoId: "R_kgDON1LZmw",
  // Discussion category name
  category: "Comments",
  // Category ID - get from giscus.app configuration
  categoryId: "DIC_kwDON1LZm84ClvPQ",
  // How to map pages to discussions
  mapping: "pathname" as const,
  // Enable reactions on main post
  reactions: true,
  // Lazy load comments
  lazy: true,
};

export default siteConfig;
