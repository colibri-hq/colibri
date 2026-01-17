import { getFeaturedBooks } from "$lib/shops/gutendex";
import type { PageLoad } from "./$types";

export const load = function load(_event) {
  const featured = { gutendex: getFeaturedBooks() };

  return { featured };
} satisfies PageLoad;
