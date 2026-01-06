import type { Component } from "svelte";
import { calculateReadingTime } from "$lib/utils/reading-time";

/**
 * Represents a heading extracted from the document for the Table of Contents.
 */
export type TocHeading = {
  /** The heading ID (slug) for anchor links */
  id: string;
  /** The heading text content */
  text: string;
  /** The heading level (1-6) */
  level: number;
};

type PageModule = {
  metadata: PageMetadata;
  default: Component;
};

export type PageMetadata = {
  title: string;
  slug: string;
  description: string;
  image?: string;
  date: string;
  categories: string[];
  draft?: boolean;
  layout?: "blog" | "docs" | "page";
  hideFromMenu?: boolean;
  order?: number;
  tags?: string[];
  relevance?: number;
  readingTime?: number;
  /** Headings extracted from the document for Table of Contents (populated by remark plugin) */
  headings?: TocHeading[];
};

/**
 * Converts a slug segment to a human-readable title.
 */
function formatTitle(segment: string): string {
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export class Page {
  public readonly __type = "Page" as const;
  public readonly metadata: PageMetadata;
  public readonly slug: string;
  public readonly content: Component;
  public readonly isIndexPage: boolean;

  public constructor(
    slug: string,
    metadata: PageMetadata,
    content: unknown,
    isIndexPage: boolean = false,
  ) {
    this.slug = slug;
    this.metadata = metadata;
    this.content = content as Component;
    this.isIndexPage = isIndexPage;
  }

  get directory() {
    return this.slug.split("/").filter(Boolean).slice(0, -1);
  }
}

/**
 * Type guard for Page instances.
 * Uses discriminator property to avoid instanceof issues across module boundaries.
 */
export function isPage(item: unknown): item is Page {
  return (
    typeof item === "object" &&
    item !== null &&
    "__type" in item &&
    item.__type === "Page"
  );
}

/**
 * Type guard for Directory instances.
 * Uses discriminator property to avoid instanceof issues across module boundaries.
 */
export function isDirectory(item: unknown): item is Directory {
  return (
    typeof item === "object" &&
    item !== null &&
    "__type" in item &&
    item.__type === "Directory"
  );
}

export class Directory {
  public readonly __type = "Directory" as const;
  /** Directory segment name (e.g., "getting-started") */
  public readonly name: string;
  /** Full slug path (e.g., "/getting-started/contributing") */
  public readonly slug: string;
  /** The index/overview page for this directory, if one exists */
  public readonly indexPage?: Page;
  /** Child pages and subdirectories */
  public readonly children: (Page | Directory)[];

  public constructor(
    name: string,
    slug: string,
    indexPage?: Page,
    children: (Page | Directory)[] = [],
  ) {
    this.name = name;
    this.slug = slug;
    this.indexPage = indexPage;
    this.children = children;
  }

  /** Metadata from the index page, if available */
  get metadata(): PageMetadata | undefined {
    return this.indexPage?.metadata;
  }

  /** Content component from the index page, if available */
  get content(): Component | undefined {
    return this.indexPage?.content;
  }

  /** Human-readable title from index page or derived from name */
  get title(): string {
    return this.indexPage?.metadata.title ?? formatTitle(this.name);
  }
}

// Eager-load all Markdown files at build/initialization time
const paths = import.meta.glob<PageModule>("$content/**/*.md", {
  eager: true,
});

// Also load raw markdown content for reading time calculation
const rawFiles = import.meta.glob<string>("$content/**/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
});

// Initialize cache synchronously at module load
const cache: Map<string, Page> = new Map();
for (const [path, item] of Object.entries(paths)) {
  let slug = (
    path.startsWith(CONTENT_ROOT_DIR)
      ? path.slice(CONTENT_ROOT_DIR.length)
      : path
  ).replace(".md", "");

  // Check if this is an index page before modifying the slug
  const isIndexPage = slug.endsWith("/index") || slug.endsWith("/overview");

  // Remove /index or /overview from the end of slugs
  if (isIndexPage) {
    slug = slug.replace(/\/(index|overview)$/, "");
  }

  if (
    !item ||
    typeof item !== "object" ||
    !("metadata" in item) ||
    !("default" in item) ||
    !slug
  ) {
    continue;
  }

  if (!item.metadata?.draft) {
    // Calculate reading time from raw markdown
    const rawContent = rawFiles[path];
    const readingTime = rawContent
      ? calculateReadingTime(rawContent)
      : undefined;

    const metadata: PageMetadata = {
      ...item.metadata,
      slug, // Ensure slug is always in metadata
      readingTime,
    };

    cache.set(slug, new Page(slug, metadata, item.default, isIndexPage));
  }
}

/**
 * Returns all pages from the pre-populated cache.
 * This is synchronous because pages are loaded eagerly at module initialization.
 */
export function getAllPages(): Map<string, Page> {
  return cache;
}

// Internal mutable structure for building the tree
type BuilderNode = {
  name: string;
  slug: string;
  indexPage?: Page;
  pages: Page[];
  subdirs: Map<string, BuilderNode>;
};

/**
 * Builds the content tree from the page cache.
 * This is an internal function - use getContentTree() to access the cached result.
 */
function buildContentTree(): (Page | Directory)[] {
  const pages = getAllPages();
  const root: Map<string, BuilderNode> = new Map();
  const topLevelPages: Page[] = [];

  // Helper to ensure a builder node exists at a given path
  function ensureNode(segments: string[]): BuilderNode | undefined {
    if (segments.length === 0) return undefined;

    const first = segments[0]!;
    const rest = segments.slice(1);
    let node = root.get(first);

    if (!node) {
      node = {
        name: first,
        slug: `/${first}`,
        pages: [],
        subdirs: new Map(),
      };
      root.set(first, node);
    }

    if (rest.length === 0) {
      return node;
    }

    return ensureChildNode(node, rest);
  }

  function ensureChildNode(
    parent: BuilderNode,
    segments: string[],
  ): BuilderNode | undefined {
    if (segments.length === 0) return parent;

    const first = segments[0]!;
    const rest = segments.slice(1);
    let child = parent.subdirs.get(first);

    if (!child) {
      child = {
        name: first,
        slug: `${parent.slug}/${first}`,
        pages: [],
        subdirs: new Map(),
      };
      parent.subdirs.set(first, child);
    }

    if (rest.length === 0) {
      return child;
    }

    return ensureChildNode(child, rest);
  }

  // Process all pages
  for (const page of pages.values()) {
    if (page.metadata.hideFromMenu) continue;

    const segments = page.slug.split("/").filter(Boolean);
    if (segments.length === 0) continue;

    if (page.isIndexPage) {
      // Index pages represent their directory
      const node = ensureNode(segments);
      if (node) {
        node.indexPage = page;
      }
    } else {
      // Regular page in a directory
      const dirSegments = segments.slice(0, -1);

      if (dirSegments.length === 0) {
        // Top-level page (no parent directory) - keep as a Page
        topLevelPages.push(page);
      } else {
        // Regular page in a directory
        const parentNode = ensureNode(dirSegments);
        if (parentNode) {
          parentNode.pages.push(page);
        }
      }
    }
  }

  // Helper to get order for sorting
  function getOrder(item: Page | Directory): number {
    if (item instanceof Page) {
      return item.metadata.order ?? 999;
    }
    return item.metadata?.order ?? 999;
  }

  function getTitle(item: Page | Directory): string {
    if (item instanceof Page) {
      return (
        item.metadata.title ?? formatTitle(item.slug.split("/").pop() ?? "")
      );
    }
    return item.title;
  }

  // Convert BuilderNode to Directory, sorting children
  function toDirectory(node: BuilderNode): Directory {
    // Recursively convert subdirectories
    const subdirs = Array.from(node.subdirs.values()).map(toDirectory);

    // Combine pages and subdirectories into a single children array
    const children: (Page | Directory)[] = [...node.pages, ...subdirs];

    // Sort by order, then by title
    children.sort((a, b) => {
      const orderA = getOrder(a);
      const orderB = getOrder(b);
      if (orderA !== orderB) return orderA - orderB;
      return getTitle(a).localeCompare(getTitle(b));
    });

    return new Directory(node.name, node.slug, node.indexPage, children);
  }

  // Convert root nodes to directories and combine with top-level pages
  const directories = Array.from(root.values()).map(toDirectory);
  const result: (Page | Directory)[] = [...topLevelPages, ...directories];

  // Sort all top-level items by order, then by title
  result.sort((a, b) => {
    const orderA = getOrder(a);
    const orderB = getOrder(b);
    if (orderA !== orderB) return orderA - orderB;
    return getTitle(a).localeCompare(getTitle(b));
  });

  return result;
}

// Memoized content tree - built once at module load
let contentTreeCache: (Page | Directory)[] | null = null;

/**
 * Returns the content organized as a tree structure.
 * The tree is built once at first access and cached for subsequent calls.
 *
 * @param maxDepth - Maximum depth of the tree (1 = top-level only, undefined = full depth)
 */
export function getContentTree(maxDepth?: number): (Page | Directory)[] {
  if (!contentTreeCache) {
    contentTreeCache = buildContentTree();
  }

  if (maxDepth === undefined) {
    return contentTreeCache;
  }

  // Capture for closure
  const depth = maxDepth;

  function filterByDepth(
    children: (Page | Directory)[],
    currentDepth: number,
  ): (Page | Directory)[] {
    if (currentDepth > depth) {
      return [];
    }

    return children.map((child) => {
      if (child instanceof Page) {
        return child;
      }

      // Directory: filter its children recursively
      return new Directory(
        child.name,
        child.slug,
        child.indexPage,
        filterByDepth(child.children, currentDepth + 1),
      );
    });
  }

  // Filter top-level items
  return filterByDepth(contentTreeCache, 1);
}

/**
 * Gets all directory slugs from the content tree (recursively).
 * Used for generating JSON/Markdown endpoint entries for directories.
 */
export function getAllDirectorySlugs(): string[] {
  const tree = getContentTree();
  const slugs: string[] = [];

  function collectSlugs(items: (Page | Directory)[]) {
    for (const item of items) {
      if (isDirectory(item)) {
        slugs.push(item.slug);
        collectSlugs(item.children);
      }
    }
  }

  collectSlugs(tree);
  return slugs;
}

/**
 * Finds a directory by slug in the content tree.
 */
export function findDirectory(slug: string): Directory | undefined {
  const tree = getContentTree();
  const normalizedSlug = normalizeSlug(slug);

  function search(items: (Page | Directory)[]): Directory | undefined {
    for (const item of items) {
      if (isDirectory(item)) {
        if (item.slug === normalizedSlug) {
          return item;
        }
        const found = search(item.children);
        if (found) return found;
      }
    }
    return undefined;
  }

  return search(tree);
}

/**
 * Normalizes a slug to a consistent format with leading slash and no trailing slash.
 */
export function normalizeSlug(slug: string): string {
  slug = slug.endsWith("/") ? slug.slice(0, -1) : slug;
  return slug.startsWith("/") ? slug : `/${slug}`;
}

/**
 * Gets a page by slug.
 * This is synchronous because pages are loaded eagerly at module initialization.
 */
export function getPage(slug: string): Page | undefined {
  return cache.get(normalizeSlug(slug));
}

/**
 * Gets the slug for a directory.
 */
export function getNodeSlug(node: Directory): string {
  return node.slug;
}

export type ParentInfo = {
  title: string;
  href: string;
};

// Parent info cache - built lazily on first access
let parentCache: Map<string, ParentInfo> | null = null;

/**
 * Builds the parent cache from the content tree.
 * Maps each page slug to its parent info for O(1) lookup.
 */
function buildParentCache(): Map<string, ParentInfo> {
  const cache = new Map<string, ParentInfo>();
  const contentTree = getContentTree();

  // Build a map from segment path to directory for quick lookup
  const dirMap = new Map<string, Directory>();

  function indexDirs(children: (Page | Directory)[], pathPrefix: string) {
    for (const child of children) {
      if (child instanceof Directory) {
        const dirPath = pathPrefix ? `${pathPrefix}/${child.name}` : child.name;
        dirMap.set(dirPath, child);
        indexDirs(child.children, dirPath);
      }
    }
  }

  // Index top-level directories (skip top-level pages)
  for (const item of contentTree) {
    if (item instanceof Directory) {
      dirMap.set(item.name, item);
      indexDirs(item.children, item.name);
    }
  }

  // For each page, compute parent info
  for (const page of getAllPages().values()) {
    const segments = page.slug.split("/").filter(Boolean);

    // No parent for root-level pages
    if (segments.length <= 1) continue;

    // Get parent path
    const parentSegments = segments.slice(0, -1);
    const parentPath = parentSegments.join("/");
    const parentSlug = "/" + parentPath;

    // Look up parent directory
    const parentDir = dirMap.get(parentPath);

    if (parentDir) {
      cache.set(page.slug, {
        title: parentDir.title,
        href: parentDir.slug,
      });
    } else {
      // Fallback: use formatted title from slug
      const lastSegment = parentSegments[parentSegments.length - 1];
      cache.set(page.slug, {
        title: lastSegment ? formatTitle(lastSegment) : "",
        href: parentSlug,
      });
    }
  }

  return cache;
}

/**
 * Gets parent information for a given slug.
 * Returns the parent directory's title and href, or undefined if at root level.
 * Uses a cached lookup for O(1) performance.
 */
export function getParentInfo(slug: string): ParentInfo | undefined {
  if (!parentCache) {
    parentCache = buildParentCache();
  }

  return parentCache.get(normalizeSlug(slug));
}

export type SiblingInfo = {
  title: string;
  href: string;
};

export type SiblingPages = {
  previous?: SiblingInfo;
  next?: SiblingInfo;
};

// Cache for flattened page order
let flattenedPagesCache: Page[] | null = null;

/**
 * Flattens the content tree into a linear list of pages in navigation order.
 * This traverses directories depth-first, including index pages.
 */
function getFlattenedPages(): Page[] {
  if (flattenedPagesCache) {
    return flattenedPagesCache;
  }

  const pages: Page[] = [];
  const contentTree = getContentTree();

  function traverse(items: (Page | Directory)[]) {
    for (const item of items) {
      if (item instanceof Page) {
        pages.push(item);
      } else {
        // Directory: add index page first (if exists), then children
        if (item.indexPage) {
          pages.push(item.indexPage);
        }
        traverse(item.children);
      }
    }
  }

  traverse(contentTree);
  flattenedPagesCache = pages;
  return pages;
}

/**
 * Gets the previous and next pages for navigation.
 * Returns siblings based on the flattened content tree order.
 */
export function getSiblingPages(slug: string): SiblingPages {
  const normalizedSlug = normalizeSlug(slug);
  const pages = getFlattenedPages();
  const currentIndex = pages.findIndex((p) => p.slug === normalizedSlug);

  if (currentIndex === -1) {
    return {};
  }

  const result: SiblingPages = {};

  if (currentIndex > 0) {
    const prev = pages[currentIndex - 1]!;
    result.previous = {
      title: prev.metadata.title,
      href: prev.slug,
    };
  }

  if (currentIndex < pages.length - 1) {
    const next = pages[currentIndex + 1]!;
    result.next = {
      title: next.metadata.title,
      href: next.slug,
    };
  }

  return result;
}

/**
 * Gets the content file path relative to the content directory for a given slug.
 * Used for "Edit on GitHub" links.
 *
 * @example
 * getContentFilePath("/getting-started") → "getting-started/index.md"
 * getContentFilePath("/getting-started/quick-start") → "getting-started/quick-start.md"
 */
export function getContentFilePath(slug: string): string | undefined {
  const page = getPage(slug);
  if (!page) return undefined;

  const slugWithoutLeadingSlash = page.slug.replace(/^\//, "");

  if (page.isIndexPage) {
    return `${slugWithoutLeadingSlash}/index.md`;
  }

  return `${slugWithoutLeadingSlash}.md`;
}

export type BreadcrumbItem = {
  title: string;
  href: string;
};

/**
 * Gets the breadcrumb trail for a given slug.
 * Returns an array of breadcrumb items from home to the current page's parent.
 *
 * @example
 * getBreadcrumbs("/getting-started/contributing/guidelines") → [
 *   { title: "Home", href: "/" },
 *   { title: "Getting Started", href: "/getting-started" },
 *   { title: "Contributing", href: "/getting-started/contributing" }
 * ]
 */
export function getBreadcrumbs(slug: string): BreadcrumbItem[] {
  const normalizedSlug = normalizeSlug(slug);
  const segments = normalizedSlug.split("/").filter(Boolean);

  // Start with Home
  const breadcrumbs: BreadcrumbItem[] = [{ title: "Home", href: "/" }];

  // Build breadcrumbs for all parent segments (exclude the last one which is the current page)
  let currentPath = "";
  for (let i = 0; i < segments.length - 1; i++) {
    currentPath += `/${segments[i]}`;
    const page = getPage(currentPath);

    breadcrumbs.push({
      title: page?.metadata.title ?? formatTitle(segments[i] ?? ""),
      href: currentPath,
    });
  }

  return breadcrumbs;
}
