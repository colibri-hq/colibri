import { json } from "@sveltejs/kit";
import { getBlogTags } from "$lib/content/blog.js";
import type { RequestHandler } from "./$types.js";

export const prerender = true;
export const trailingSlash = "never";

type TagInfo = {
	name: string;
	slug: string;
	count: number;
};

type TagListingResponse = {
	type: "tag-listing";
	tags: TagInfo[];
	total: number;
	links: {
		html: string;
		json: string;
	};
};

export const GET: RequestHandler = async ({ url }) => {
	const tags = getBlogTags();
	const baseUrl = url.origin;

	const tagList: TagInfo[] = Array.from(tags.entries()).map(([name, count]) => ({
		name,
		slug: encodeURIComponent(name),
		count,
	}));

	const response: TagListingResponse = {
		type: "tag-listing",
		tags: tagList,
		total: tagList.length,
		links: {
			html: `${baseUrl}/blog/tag`,
			json: `${baseUrl}/blog/tag.json`,
		},
	};

	return json(response, {
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			Link: `<${response.links.html}>; rel="alternate"; type="text/html"`,
		},
	});
};
