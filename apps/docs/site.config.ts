import { PUBLIC_SITE_URL } from "$env/static/public";

export const siteConfig = {
  // Site general information
  site: {
    name: "Colibri",
    description:
      "Self-hosted ebook library with metadata enrichment and passwordless authentication",
    url: PUBLIC_SITE_URL as `https://${string}` | `http://${string}`,
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

export const blogConfig = {
  title: "Colibri Development Blog",
  description:
    "Development updates, tutorials, and insights from the Colibri team",
};
