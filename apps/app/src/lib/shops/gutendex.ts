import { env } from "$env/dynamic/public";
import { log } from "$lib/logging";
import type { Shop, SupportsFeaturedBooks } from "$lib/shops/index";

function serializeOptions(options: Partial<SearchParameters>) {
  const parameters = new URLSearchParams();

  for (const [key, value] of Object.entries(options)) {
    parameters.set(
      key,
      Array.isArray(value) ? value.join(",") : value.toString(),
    );
  }

  return parameters.toString();
}

export async function searchBooks(
  query: string,
  options?: Partial<SearchParameters>,
) {
  const url = new URL("books", env.PUBLIC_GUTENDEX_INSTANCE_URL);
  url.search = serializeOptions({ ...options, search: query });

  const { results, count: total } = await request<ListingResponse>(
    new Request(url),
  );

  return { results, total };
}

export async function retrieveBook(id: number) {
  const baseUrl = new URL("books", env.PUBLIC_GUTENDEX_INSTANCE_URL);

  return await request<BookResponse>(new Request(`${baseUrl}/${id}`));
}

export async function getFeaturedBooks(amount: number = 10) {
  const baseUrl = new URL("books", env.PUBLIC_GUTENDEX_INSTANCE_URL);

  try {
    const { results } = await request<ListingResponse>(new Request(baseUrl));

    return results.slice(0, amount);
  } catch (error) {
    log(
      "gutendex",
      "error",
      `Failed to fetch featured books from Gutendex API: ${(error as Error).message}`,
    );

    return [];
  }
}

export class Gutendex
  implements
    Shop<BookResponse, SearchParameters>,
    SupportsFeaturedBooks<BookResponse, SearchParameters>
{
  async search(query: string, options?: Partial<SearchParameters>) {
    return searchBooks(query, options);
  }

  async getFeaturedBooks() {
    return getFeaturedBooks();
  }
}

async function request<T>(request: Request) {
  let response: Response;
  let plainBody: string;
  let body: T;

  log("gutendex", "debug", `Fetching data from Gutendex API: ${request.url}`);

  try {
    response = await fetch(request);
    plainBody = await response.text();
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    throw new Error(
      `Failed to fetch data from Gutendex API: Connection error: ${error.message}`,
    );
  }

  try {
    body = JSON.parse(plainBody);
  } catch (cause) {
    throw new Error(
      `Failed to fetch data Gutendex API: Invalid JSON response: ${plainBody}`,
      { cause },
    );
  }

  if (!response.ok) {
    throw new Error(
      // @ts-expect-error TODO: Implement proper error handling
      `Failed to fetch data from Gutendex API: ${body?.error?.message || plainBody}`,
    );
  }

  log("gutendex", "debug", `Fetched data from Gutendex API: ${request.url}`, {
    body,
  });

  return body;
}

interface SearchParameters {
  /**
   * Use these to find books with at least one author alive in a given range of years. They must
   * have positive or negative integer values. For example, /books?author_year_end=-499 gives books
   * with authors alive before 500 BCE, and /books?author_year_start=1800&author_year_end=1899 gives
   * books with authors alive in the 19th Century.
   */
  author_year_start: number;
  author_year_end: number;

  /**
   * Use this to find books with a certain copyright status: true for books with existing
   * copyrights, false for books in the public domain in the USA, or null for books with no
   * available copyright information. These can be combined with commas. For example,
   * /books?copyright=true,false gives books with available copyright information.
   */
  copyright: ("true" | "false" | "null")[];

  /**
   * Use this to list books with Project Gutenberg ID numbers in a given list of numbers. They must
   * be comma-separated positive integers. For example, /books?ids=11,12,13 gives books with ID
   * numbers 11, 12, and 13.
   */
  ids: number[];

  /**
   * Use this to find books in any of a list of languages. They must be comma-separated,
   * two-character language codes. For example, /books?languages=en gives books in English, and
   * /books?languages=fr,fi gives books in either French or Finnish or both.
   */
  languages: string[];

  /**
   * Use this to find books with a given MIME type. Gutendex gives every book with a MIME type
   * starting with the value. For example, /books?mime_type=text%2F gives books with types
   * text/html, text/plain; charset=us-ascii, etc.; and /books?mime_type=text%2Fhtml gives books
   * with types text/html, text/html; charset=utf-8, etc.
   */
  mime_type: string;

  /**
   * Use this to search author names and book titles with given words. They must be separated by a
   * space (i.e. %20 in URL-encoded format) and are case-insensitive. For example,
   * /books?search=dickens%20great includes Great Expectations by Charles Dickens.
   */
  search: string;

  /**
   * Use this to sort books: ascending for Project Gutenberg ID numbers from lowest to highest,
   * descending for IDs highest to lowest, or popular (the default) for most popular to least
   * popular by number of downloads.
   */
  sort: "ascending" | "descending" | "popular";

  /**
   * Use this to search for a case-insensitive key-phrase in books' bookshelves or subjects.
   * For example, /books?topic=children gives books on the "Children's Literature" bookshelf, with
   * the subject "Sick children -- Fiction", and so on.
   */
  topic: string;
}

interface ListingResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: BookResponse[];
}

interface BookResponse {
  id: number;
  title: string;
  authors: Person[];
  translators: Person[];
  subjects: string[];
  bookshelves: string[];
  languages: string[];
  copyright: boolean | null;
  media_type: string;
  formats: Format;
  download_count: number;
  placeholder: true;
}

type Format = Record<
  `${string}/${string}`,
  `http://${string}` | `https://${string}`
>;

interface Person {
  birth_year: number | null;
  death_year: number | null;
  name: string;
}
