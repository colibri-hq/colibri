import { authorNameToSlug } from "$lib/content/author.js";
import { type AuthorInfo, getBlogAuthors } from "$lib/content/blog.js";
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";

export const prerender = true;
export const trailingSlash = "never";

export const GET = async function GET({ url }) {
  const authors = await getBlogAuthors();
  const baseUrl = url.origin;

  const authorList = Array.from(authors.entries()).map(
    ([_, info]): AuthorSummary => summarizeAuthor(info),
  );

  const response: AuthorListingResponse = {
    type: "author-listing",
    authors: authorList,
    total: authorList.length,
    links: { html: `${baseUrl}/blog/author`, json: `${baseUrl}/blog/author.json` },
  };

  return json(response, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Link: `<${response.links.html}>; rel="alternate"; type="text/html"`,
    },
  });
} satisfies RequestHandler;

function summarizeAuthor({
  author: { email, gravatarUrl, name },
  count,
}: AuthorInfo): AuthorSummary {
  return { name, email, slug: authorNameToSlug(name), gravatarUrl: gravatarUrl, postCount: count };
}

type AuthorSummary = {
  name: string;
  slug: string;
  email?: string;
  gravatarUrl?: string;
  postCount: number;
};

type AuthorListingResponse = {
  type: "author-listing";
  authors: AuthorSummary[];
  total: number;
  links: { html: string; json: string };
};
