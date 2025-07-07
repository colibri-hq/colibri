import { log } from "$lib/logging";

const baseURL = "https://openlibrary.org";

type BookSearchParams = {
  title: string;
  authors?: string[] | undefined;
  genre?: string | undefined;
  isbn?: string | undefined;
  language?: string | undefined;
};

export async function searchBook(params: BookSearchParams) {
  const parameterNames: Record<keyof BookSearchParams, string> = {
    title: "title_suggest",
    authors: "author",
    genre: "subject",
    isbn: "isbn",
    language: "lang",
  };
  const url = new URL("search.json", baseURL);

  Object.entries(params)
    .filter(
      <K extends keyof BookSearchParams>(
        item: [unknown, unknown],
      ): item is [K, Exclude<BookSearchParams[K], undefined>] =>
        typeof item[1] !== "undefined",
    )
    .flatMap(([key, value]) => {
      const parameterName = parameterNames[key];

      return Array.isArray(value)
        ? value.map((item) => [parameterName, item])
        : [[parameterName, value]];
    })
    .reduce((acc, [key, value]) => {
      acc.set(key, value);

      return acc;
    }, url.searchParams);

  try {
    const response = await request<OpenLibrarySearchResponse>(
      new Request(url, {}),
    );

    return {
      amount: response.numFound,
      books: response.docs,
    };
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error;
    }

    throw new Error(`Failed to search for book: ${error.message}`);
  }
}

async function request<T>(request: Request) {
  let response: Response;
  let plainBody: string;
  let body: T;

  log(
    "open-library",
    "debug",
    `Fetching data from Open Library API: ${request.url}`,
  );

  try {
    response = await fetch(request);
    plainBody = await response.text();
  } catch (cause) {
    if (!(cause instanceof Error)) {
      throw cause;
    }

    throw new Error(
      `Failed to fetch data from Open Library API: Connection error: ${cause.message}`,
      { cause },
    );
  }

  try {
    body = JSON.parse(plainBody);
  } catch (cause) {
    throw new Error(
      `Failed to fetch data from Open Library API: Invalid JSON response: ${plainBody}`,
      { cause },
    );
  }

  if (!response.ok) {
    throw new Error(
      // @ts-expect-error TODO: Implement proper error handling
      `Failed to fetch data from Open Library API: ${body?.error?.message || plainBody}`,
    );
  }

  log(
    "open-library",
    "debug",
    `Fetched data from Open Library API: ${request.url}`,
    { body },
  );

  return body;
}

/**
 * @see https://openlibrary.org/search.json?title=The+Hobbit&fields=*&limit=1
 */
interface OpenLibraryBook {
  author_key: string[];
  author_name: string[];
  author_alternative_name: string[];
  contributor: string[];
  cover_edition_key: string;
  cover_i: number;
  ddc: string[];
  ebook_access: string;
  ebook_count_i: number;
  edition_count: number;
  edition_key: string[];
  first_publish_year: number;
  first_sentence: string[];
  format: string[];
  has_fulltext: boolean;
  ia: string[];
  ia_collection: string[];
  ia_collection_s: string;
  isbn: string[];
  key: string;
  language: string[];
  last_modified_i: number;
  lcc: string[];
  lccn: string[];
  lending_edition_s: string;
  lending_identifier_s: string;
  number_of_pages_median: number;
  oclc: string[];
  osp_count: number;
  printdisabled_s: string;
  public_scan_b: boolean;
  publish_date: string[];
  publish_place: string[];
  publish_year: number[];
  publisher: string[];
  seed: string[];
  title: string;
  title_suggest: string;
  title_sort: string;
  type: string;
  id_amazon: string[];
  id_better_world_books: string[];
  id_wikidata: string[];
  id_goodreads: string[];
  id_depósito_legal: string[];
  id_google: string[];
  id_librarything: string[];
  id_bcid: string[];
  id_alibris_id: string[];
  id_abebooks: string[];
  id_bnc: string[];
  id_overdrive: string[];
  id_libris: string[];
  id_dnb: string[];
  subject: string[];
  place: string[];
  time: string[];
  person: string[];
  ia_loaded_id: string[];
  ia_box_id: string[];
  ratings_average: number;
  ratings_sortable: number;
  ratings_count: number;
  ratings_count_1: number;
  ratings_count_2: number;
  ratings_count_3: number;
  ratings_count_4: number;
  ratings_count_5: number;
  readinglog_count: number;
  want_to_read_count: number;
  currently_reading_count: number;
  already_read_count: number;
  publisher_facet: string[];
  person_key: string[];
  time_facet: string[];
  place_key: string[];
  person_facet: string[];
  subject_facet: string[];
  _version_: number;
  place_facet: string[];
  lcc_sort: string;
  author_facet: string[];
  subject_key: string[];
  ddc_sort: string;
  time_key: string[];

  id_bodleian_library: string[];
  id_british_library: string[];
  id_canadian_national_library_archive: string[];
  id_hathi_trust: string[];
  id_national_archives: string[];
  id_national_library: string[];
  id_nla: string[];
  id_paperback_swap: string[];
  id_readprint: string[];
}

interface OpenLibrarySearchResponse {
  numFound: number;
  start: number;
  numFoundExact: boolean;
  num_found: number;
  q: string;
  offset: number | null;
  docs: Partial<OpenLibraryBook>[];
}
