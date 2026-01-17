import { getPage, getBreadcrumbs, normalizeSlug } from "$lib/content/content";

export type LinkPreviewData = {
  title: string;
  description: string;
  breadcrumbs: Array<{ title: string; href: string }>;
  slug: string;
};

/**
 * Checks if an href points to an internal documentation page.
 * Returns false for external links, anchor links, and protocol links.
 */
export function isInternalDocLink(href: string): boolean {
  if (!href) return false;

  // Anchor-only links are not previewable
  if (href.startsWith("#")) return false;

  // Protocol links (mailto:, tel:, etc.) are external
  if (href.includes(":") && !href.startsWith("http")) return false;

  // Absolute URLs - check if they're to the docs domain
  if (href.startsWith("http://") || href.startsWith("https://")) {
    try {
      const url = new URL(href);
      // Consider localhost and colibri domains as internal
      const isInternal = url.hostname === "localhost" || url.hostname.includes("colibri");
      return isInternal;
    } catch {
      return false;
    }
  }

  // Relative paths are internal
  return true;
}

/**
 * Gets preview data for an internal documentation link.
 * Returns null if the page doesn't exist.
 */
export function getLinkPreviewData(href: string): LinkPreviewData | null {
  // Remove anchor from href
  const hrefWithoutAnchor = href.split("#")[0] ?? href;

  // Handle absolute URLs by extracting pathname
  let slug = hrefWithoutAnchor;
  if (slug.startsWith("http://") || slug.startsWith("https://")) {
    try {
      const url = new URL(slug);
      slug = url.pathname;
    } catch {
      return null;
    }
  }

  // Normalize and look up the page
  const normalizedSlug = normalizeSlug(slug);
  const page = getPage(normalizedSlug);

  if (!page) return null;

  // Get breadcrumbs, skipping "Home" for a cleaner preview
  const breadcrumbs = getBreadcrumbs(normalizedSlug).slice(1);

  return {
    title: page.metadata.title,
    description: page.metadata.description,
    breadcrumbs,
    slug: normalizedSlug,
  };
}
