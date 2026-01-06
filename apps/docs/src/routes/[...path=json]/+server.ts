import { error, json } from "@sveltejs/kit";
import {
	getAllPages,
	getAllDirectorySlugs,
	findDirectory,
	getPage,
	getBreadcrumbs,
	getSiblingPages,
	getParentInfo,
	normalizeSlug,
	isPage,
	isDirectory,
	type PageMetadata,
	type BreadcrumbItem,
	type SiblingPages,
	type ParentInfo,
	type TocHeading,
	type Page,
	type Directory,
} from "$lib/content/content.js";
import {
	getBlogPost,
	getBlogPosts,
	getAdjacentPosts,
	getSeriesPosts,
	getSeriesSlug,
	getRelatedPosts,
	type BlogPost,
	type BlogPostMetadata,
} from "$lib/content/blog.js";
import { getAuthorWithGravatar, type AuthorWithGravatar } from "$lib/content/author.js";
import type { EntryGenerator, RequestHandler } from "./$types.js";

export const prerender = true;
export const trailingSlash = "never";

// Load all Markdown files as raw strings at build time
const rawFiles = import.meta.glob("$content/**/*.md", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

// Map raw content by slug
const contentMap = new Map<string, string>();
for (const [path, content] of Object.entries(rawFiles)) {
	const slug =
		path
			.replace(/^.*\/content/, "")
			.replace(/\.md$/, "")
			.replace(/\/(index|overview)$/, "") || "/";
	contentMap.set(slug, content);
}

/**
 * Strip frontmatter from markdown content
 */
function stripFrontmatter(content: string): string {
	return content.replace(/^---[\s\S]*?---\n*/, "");
}

/**
 * HATEOAS link structure for JSON API navigation
 */
type HateoasLink = {
	title?: string;
	html: string;
	json: string;
	markdown?: string;
	type?: "page" | "directory";
};

type HateoasLinks = {
	self: HateoasLink;
	parent?: HateoasLink;
	children?: HateoasLink[];
	siblings?: {
		previous?: HateoasLink;
		next?: HateoasLink;
	};
	breadcrumbs?: HateoasLink[];
};

/**
 * Build HATEOAS links for navigation
 */
function buildHateoasLinks(
	baseUrl: string,
	slug: string,
	options: {
		title?: string;
		hasMarkdown?: boolean;
		parent?: ParentInfo;
		siblings?: SiblingPages;
		breadcrumbs?: BreadcrumbItem[];
		children?: Array<{ slug: string; title: string; type: "page" | "directory" }>;
	},
): HateoasLinks {
	const normalizedSlug = slug.endsWith("/") ? slug.slice(0, -1) : slug;
	const path = normalizedSlug || "";

	const links: HateoasLinks = {
		self: {
			title: options.title,
			html: `${baseUrl}${path}`,
			json: `${baseUrl}${path}.json`,
			markdown: options.hasMarkdown !== false ? `${baseUrl}${path}.md` : undefined,
		},
	};

	// Parent link
	if (options.parent) {
		const parentPath = options.parent.href;
		links.parent = {
			title: options.parent.title,
			html: `${baseUrl}${parentPath}`,
			json: `${baseUrl}${parentPath}.json`,
		};
	}

	// Sibling links
	if (options.siblings?.previous || options.siblings?.next) {
		links.siblings = {};
		if (options.siblings.previous) {
			links.siblings.previous = {
				title: options.siblings.previous.title,
				html: `${baseUrl}${options.siblings.previous.href}`,
				json: `${baseUrl}${options.siblings.previous.href}.json`,
			};
		}
		if (options.siblings.next) {
			links.siblings.next = {
				title: options.siblings.next.title,
				html: `${baseUrl}${options.siblings.next.href}`,
				json: `${baseUrl}${options.siblings.next.href}.json`,
			};
		}
	}

	// Breadcrumb links
	if (options.breadcrumbs && options.breadcrumbs.length > 0) {
		links.breadcrumbs = options.breadcrumbs.map((bc) => ({
			title: bc.title,
			html: `${baseUrl}${bc.href}`,
			json: bc.href === "/" ? `${baseUrl}/index.json` : `${baseUrl}${bc.href}.json`,
		}));
	}

	// Children links
	if (options.children && options.children.length > 0) {
		links.children = options.children.map((child) => ({
			title: child.title,
			html: `${baseUrl}${child.slug}`,
			json: `${baseUrl}${child.slug}.json`,
			type: child.type,
		}));
	}

	return links;
}

// Types for JSON responses

type ChildPageSummary = {
	type: "page";
	slug: string;
	title: string;
	description?: string;
	order?: number;
};

type ChildDirectorySummary = {
	type: "directory";
	slug: string;
	title: string;
	description?: string;
	order?: number;
	hasIndexPage: boolean;
};

type PageJsonResponse = {
	type: "page";
	slug: string;
	metadata: PageMetadata;
	content: string;
	toc: TocHeading[];
	links: HateoasLinks;
	isIndexPage: boolean;
	children?: (ChildPageSummary | ChildDirectorySummary)[];
};

type DirectoryJsonResponse = {
	type: "directory";
	slug: string;
	title: string;
	description?: string;
	links: HateoasLinks;
	children: (ChildPageSummary | ChildDirectorySummary)[];
};

type BlogPostJsonResponse = {
	type: "blog";
	slug: string;
	metadata: BlogPostMetadata;
	author: AuthorWithGravatar;
	content: string;
	toc: TocHeading[];
	links: HateoasLinks;
	series?: {
		name: string;
		slug: string;
		currentPosition: number;
		totalPosts: number;
		posts: Array<{ slug: string; title: string }>;
	};
	relatedPosts: Array<{ slug: string; title: string; tags: string[] }>;
};

/**
 * Serialize children for directory pages
 */
function serializeChildren(children: (Page | Directory)[]): (ChildPageSummary | ChildDirectorySummary)[] {
	return children.map((child) => {
		if (isPage(child)) {
			return {
				type: "page" as const,
				slug: child.slug,
				title: child.metadata.title,
				description: child.metadata.description,
				order: child.metadata.order,
			};
		} else if (isDirectory(child)) {
			return {
				type: "directory" as const,
				slug: child.slug,
				title: child.title,
				description: child.metadata?.description,
				order: child.metadata?.order,
				hasIndexPage: !!child.indexPage,
			};
		}
		// Fallback (shouldn't happen)
		return {
			type: "page" as const,
			slug: "",
			title: "Unknown",
		};
	});
}

/**
 * Generate entries for all pages and directories with .json suffix.
 * Blog posts are excluded since they're handled by /blog/[slug].json routes.
 */
export const entries: EntryGenerator = () => {
	const pages = getAllPages();
	const directorySlugs = getAllDirectorySlugs();

	// Regular documentation pages (including directory index pages)
	// Exclude blog posts - they're handled by dedicated /blog/[slug].json endpoints
	const pageEntries = Array.from(pages.keys())
		.filter((slug) => !slug.startsWith("/blog/"))
		.map((slug) => ({
			path: `${slug.replace(/^\//, "")}.json`,
		}));

	// Directory entries (for directories that may not have index pages)
	const dirEntries = directorySlugs
		.filter((slug) => !slug.startsWith("/blog/"))
		.map((slug) => ({
			path: `${slug.replace(/^\//, "")}.json`,
		}));

	// Combine and deduplicate (directories with index pages will be in both lists)
	const seen = new Set<string>();
	const allEntries: Array<{ path: string }> = [];

	for (const entry of [...pageEntries, ...dirEntries]) {
		if (!seen.has(entry.path)) {
			seen.add(entry.path);
			allEntries.push(entry);
		}
	}

	return allEntries;
};

export const GET: RequestHandler = async ({ params, url }) => {
	const path = params.path;

	// Remove .json extension to get the slug
	const rawSlug = path.slice(0, -5); // Remove ".json"
	const slug = normalizeSlug(rawSlug);
	const baseUrl = url.origin;

	// Check if this is a blog post
	if (slug.startsWith("/blog/")) {
		const urlSlug = slug.replace(/^\/blog\//, "");
		const post = getBlogPost(urlSlug);

		if (!post) {
			error(404, "Blog post not found");
		}

		const rawContent = contentMap.get(slug);
		if (!rawContent) {
			error(404, "Blog content not found");
		}

		const author = await getAuthorWithGravatar(post.metadata.author, 64);
		const adjacent = getAdjacentPosts(urlSlug);
		const relatedPosts = getRelatedPosts(post, 3);

		// Build series info if applicable
		let seriesInfo: BlogPostJsonResponse["series"] = undefined;
		if (post.metadata.series) {
			const seriesPosts = getSeriesPosts(post.metadata.series);
			const currentPosition = seriesPosts.findIndex((p) => p.urlSlug === urlSlug);
			seriesInfo = {
				name: post.metadata.series,
				slug: getSeriesSlug(post.metadata.series),
				currentPosition: currentPosition + 1,
				totalPosts: seriesPosts.length,
				posts: seriesPosts.map((p) => ({
					slug: p.urlSlug,
					title: p.metadata.title,
				})),
			};
		}

		// Build HATEOAS links for blog post
		const blogBreadcrumbs: BreadcrumbItem[] = [
			{ title: "Home", href: "/" },
			{ title: "Blog", href: "/blog" },
		];

		const blogSiblings: SiblingPages = {
			previous: adjacent.previous
				? { title: adjacent.previous.metadata.title, href: `/blog/${adjacent.previous.urlSlug}` }
				: undefined,
			next: adjacent.next
				? { title: adjacent.next.metadata.title, href: `/blog/${adjacent.next.urlSlug}` }
				: undefined,
		};

		const response: BlogPostJsonResponse = {
			type: "blog",
			slug: urlSlug,
			metadata: post.metadata,
			author: {
				name: author.name,
				email: author.email,
				gravatarUrl: author.gravatarUrl,
			},
			content: stripFrontmatter(rawContent),
			toc: post.metadata.headings ?? [],
			links: buildHateoasLinks(baseUrl, `/blog/${urlSlug}`, {
				title: post.metadata.title,
				hasMarkdown: true,
				parent: { title: "Blog", href: "/blog" },
				siblings: blogSiblings,
				breadcrumbs: blogBreadcrumbs,
			}),
			series: seriesInfo,
			relatedPosts: relatedPosts.map((p) => ({
				slug: p.urlSlug,
				title: p.metadata.title,
				tags: p.metadata.tags ?? [],
			})),
		};

		return json(response, {
			headers: {
				"Content-Type": "application/json; charset=utf-8",
				Link: `<${response.links.self.html}>; rel="alternate"; type="text/html"`,
			},
		});
	}

	// Try to get page first
	const page = getPage(slug);
	const directory = findDirectory(slug);

	// Handle directory-only case (no index page)
	if (!page && directory) {
		const children = serializeChildren(directory.children);
		const childrenForLinks = children.map((c) => ({
			slug: c.slug,
			title: c.title,
			type: c.type,
		}));

		const response: DirectoryJsonResponse = {
			type: "directory",
			slug: directory.slug,
			title: directory.title,
			description: directory.metadata?.description,
			links: buildHateoasLinks(baseUrl, directory.slug, {
				title: directory.title,
				hasMarkdown: false,
				parent: getParentInfo(directory.slug),
				breadcrumbs: getBreadcrumbs(directory.slug),
				children: childrenForLinks,
			}),
			children,
		};

		return json(response, {
			headers: {
				"Content-Type": "application/json; charset=utf-8",
				Link: `<${response.links.self.html}>; rel="alternate"; type="text/html"`,
			},
		});
	}

	// Page not found
	if (!page) {
		error(404, "Page not found");
	}

	const rawContent = contentMap.get(slug);
	if (!rawContent) {
		error(404, "Content not found");
	}

	const breadcrumbs = getBreadcrumbs(slug);
	const siblings = getSiblingPages(slug);
	const parent = getParentInfo(slug);

	// For index pages, include children from the directory
	let children: (ChildPageSummary | ChildDirectorySummary)[] | undefined;
	let childrenForLinks: Array<{ slug: string; title: string; type: "page" | "directory" }> | undefined;

	if (page.isIndexPage && directory) {
		children = serializeChildren(directory.children);
		childrenForLinks = children.map((c) => ({
			slug: c.slug,
			title: c.title,
			type: c.type,
		}));
	}

	const response: PageJsonResponse = {
		type: "page",
		slug: page.slug,
		metadata: page.metadata,
		content: stripFrontmatter(rawContent),
		toc: page.metadata.headings ?? [],
		links: buildHateoasLinks(baseUrl, page.slug, {
			title: page.metadata.title,
			hasMarkdown: true,
			parent,
			siblings,
			breadcrumbs,
			children: childrenForLinks,
		}),
		isIndexPage: page.isIndexPage,
		children,
	};

	return json(response, {
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			Link: `<${response.links.self.html}>; rel="alternate"; type="text/html"`,
		},
	});
};
