import type { Transport } from "@sveltejs/kit";
import {
  Directory,
  getPage,
  isDirectory,
  isPage,
  type Page,
} from "$lib/content/content";
import { getBlogPost, isBlogPost, type BlogPost } from "$lib/content/blog";

export const transport: Transport = {
  Page: {
    encode(page: unknown) {
      if (!isPage(page)) {
        return false;
      }

      const { metadata, slug, isIndexPage } = page;
      return { metadata, slug, isIndexPage };
    },
    decode(data: { slug: string }): Page {
      const page = getPage(data.slug);

      if (!page) {
        throw new Error(`Page not found for slug: ${data.slug}`);
      }

      return page;
    },
  },
  Directory: {
    encode(directory: unknown) {
      if (!isDirectory(directory)) {
        return false;
      }

      const { name, slug, indexPage, children } = directory;
      return { name, slug, indexPage, children };
    },
    decode(data: {
      name: string;
      slug: string;
      indexPage?: Page;
      children: (Page | Directory)[];
    }): Directory {
      return new Directory(data.name, data.slug, data.indexPage, data.children);
    },
  },
  BlogPost: {
    encode(post: unknown) {
      if (!isBlogPost(post)) {
        return false;
      }

      // Only serialize the urlSlug - we'll reconstruct from cache on decode
      const { urlSlug } = post;
      return { urlSlug };
    },
    decode(data: { urlSlug: string }): BlogPost {
      const post = getBlogPost(data.urlSlug);

      if (!post) {
        throw new Error(`BlogPost not found for urlSlug: ${data.urlSlug}`);
      }

      return post;
    },
  },
};
