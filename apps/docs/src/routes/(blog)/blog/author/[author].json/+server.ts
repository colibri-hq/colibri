import { error, json } from "@sveltejs/kit";
import { getBlogAuthors, getPostsByAuthor, type BlogPost } from "$lib/content/blog.js";
import {
	authorNameToSlug,
	slugToAuthorName,
	getAuthorWithGravatar,
} from "$lib/content/author.js";
import type { EntryGenerator, RequestHandler } from "./$types.js";

export const prerender = true;
export const trailingSlash = "never";

type BlogPostSummary = {
	slug: string;
	urlSlug: string;
	title: string;
	description: string;
	date: string;
	tags: string[];
};

type AuthorPostsResponse = {
	type: "author-posts";
	author: {
		name: string;
		slug: string;
		email?: string;
		gravatarUrl?: string;
	};
	posts: BlogPostSummary[];
	total: number;
	links: {
		html: string;
		json: string;
		authorListing: string;
	};
};

function summarizePost(post: BlogPost): BlogPostSummary {
	return {
		slug: post.slug,
		urlSlug: post.urlSlug,
		title: post.metadata.title,
		description: post.metadata.description,
		date: post.metadata.date,
		tags: post.metadata.tags ?? [],
	};
}

export const entries: EntryGenerator = async () => {
	const authors = await getBlogAuthors();
	return Array.from(authors.values()).map((info) => ({
		author: authorNameToSlug(info.author.name),
	}));
};

export const GET: RequestHandler = async ({ params, url }) => {
	const authorSlug = params.author;
	const authorName = slugToAuthorName(authorSlug);
	const posts = getPostsByAuthor(authorName);
	const baseUrl = url.origin;

	if (posts.length === 0) {
		error(404, `No posts found for author: ${authorName}`);
	}

	// Get author info from first post
	const authorString = posts[0]!.metadata.author;
	const authorInfo = await getAuthorWithGravatar(authorString, 64);

	const response: AuthorPostsResponse = {
		type: "author-posts",
		author: {
			name: authorInfo.name,
			slug: authorSlug,
			email: authorInfo.email,
			gravatarUrl: authorInfo.gravatarUrl,
		},
		posts: posts.map(summarizePost),
		total: posts.length,
		links: {
			html: `${baseUrl}/blog/author/${authorSlug}`,
			json: `${baseUrl}/blog/author/${authorSlug}.json`,
			authorListing: `${baseUrl}/blog/author.json`,
		},
	};

	return json(response, {
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			Link: `<${response.links.html}>; rel="alternate"; type="text/html"`,
		},
	});
};
