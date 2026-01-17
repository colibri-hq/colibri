import { wrapArray } from "@colibri-hq/shared";
import type {
  Author,
  AuthorId,
  BookSearchResult,
  BookSearchResults,
  Edition,
  EditionId,
  SearchResultsResponsePayload,
  Work,
  WorkId,
} from "./types.js";
import packageJson from "../package.json" with { type: "json" };
import {
  type AuthorSearchField,
  type AuthorSearchSortFacet,
  type BookSearchField,
  type BookSearchSortFacet,
  buildSearchQuery,
  type SearchQuery,
} from "./search.js";

const defaultApplicationName = "Colibri" as const;
const defaultBaseUrl = "https://openlibrary.org" as const;
const defaultCoversBaseUrl = "https://covers.openlibrary.org" as const;
const defaultLimit = 50;

export class Client {
  readonly #userAgentInfo: string;
  readonly #fetch: Fetch;
  readonly #baseUrl: URL;
  readonly #coversBaseUrl: URL;

  constructor(
    contactInfo: ContactInfo,
    {
      applicationName = defaultApplicationName,
      fetch = globalThis.fetch,
      baseUrl = defaultBaseUrl,
      coversBaseUrl = defaultCoversBaseUrl,
    }: ClientOptions = {},
  ) {
    // noinspection SuspiciousTypeOfGuard
    if (typeof contactInfo !== "string" || contactInfo.trim() === "") {
      throw new Error(
        "Contact information must be a non-empty string; see " +
          "https://openlibrary.org/developers/api",
      );
    }

    this.#userAgentInfo = `${applicationName} (${contactInfo})`;
    this.#fetch = fetch;
    this.#baseUrl = baseUrl instanceof URL ? baseUrl : new URL(baseUrl);
    this.#coversBaseUrl = coversBaseUrl instanceof URL ? coversBaseUrl : new URL(coversBaseUrl);
  }

  // region Books

  // region Works

  async loadWork(id: WorkId): Promise<Work | null> {
    return await this.loadOne<Work>(`/works/${id}.json`);
  }

  async loadBookshelveStatsByWorkId(id: WorkId): Promise<BookshelveStatsResponse | null> {
    return await this.loadOne<BookshelveStatsResponse>(`/works/${id}/bookshelves.json`);
  }

  async loadRatingsByWorkId(id: WorkId): Promise<RatingsResponse | null> {
    return await this.loadOne<RatingsResponse>(`/works/${id}/ratings.json`);
  }

  async *loadWorksByAuthorId(id: AuthorId, options?: ListOptions) {
    const response = this.loadMany<Work>(`/authors/${id}/works.json`, options);

    for await (const { entries } of response) {
      for (const work of entries) {
        yield work;
      }
    }
  }

  // endregion

  // region Editions

  async loadEdition(id: EditionId): Promise<Edition | null> {
    return await this.loadOne<Edition>(`/books/${id}.json`);
  }

  async *loadEditionsByWorkId(id: WorkId, options?: ListOptions) {
    const response = this.loadMany<Edition>(`/works/${id}/editions.json`, options);

    for await (const { entries } of response) {
      for (const edition of entries) {
        yield edition;
      }
    }
  }

  // endregion

  // region ISBNs

  async loadEditionByIsbn(isbn: string): Promise<Edition | null> {
    return await this.loadOne<Edition>(`/isbn/${isbn}.json`, { redirect: "follow" });
  }

  // endregion

  // endregion

  // region Authors

  async loadAuthor(id: string): Promise<Author | null> {
    return await this.loadOne<Author>(`/authors/${id}.json`);
  }

  // endregion

  // region Search

  // region Books

  searchBook(
    query: string | SearchQuery<BookSearchField>,
    {
      fields,
      language,
      limit,
      offset,
      sortBy,
    }: {
      language?: string;
      sortBy?: BookSearchSortFacet;
      fields?: BookSearchField[] | "*";
      limit?: number;
      offset?: number;
    } = {},
  ): AsyncGenerator<BookSearchResult, void, unknown> {
    return this.#search<BookSearchResult, BookSearchResults>("/search.json", query, {
      fields: fields ? wrapArray(fields).join(",") : undefined,
      limit: typeof limit !== "undefined" ? Math.max(1, limit) : undefined,
      offset: typeof offset !== "undefined" ? Math.max(0, offset) : undefined,
      sort: sortBy,
      lang: language,
    });
  }

  // endregion

  // region Authors

  searchAuthor(
    query: string | SearchQuery<AuthorSearchField>,
    {
      fields,
      limit,
      offset,
      sortBy,
    }: {
      fields?: AuthorSearchField[] | "*";
      limit?: number;
      offset?: number;
      sortBy?: AuthorSearchSortFacet;
    } = {},
  ): AsyncGenerator<Author, void, unknown> {
    return this.#search<Author>("/authors/search.json", query, {
      fields: fields ? wrapArray(fields).join(",") : undefined,
      limit: limit ? Math.max(1, limit) : undefined,
      offset: offset ? Math.max(0, offset) : undefined,
      sort: sortBy,
    });
  }

  // endregion

  // endregion

  // region Images

  loadCover(
    identifier: string,
    {
      size = "M",
      type = "olid",
    }: { size?: "S" | "M" | "L"; type?: "olid" | "isbn" | "oclc" | "lccn" | "id" } = {},
  ): Promise<File | null> {
    const filename = `${identifier}-${size}.jpg`;
    const url = new URL(`/b/${type}/${filename}?default=false`, this.#coversBaseUrl);

    return this.#loadImage(url, filename);
  }

  loadAuthorPhoto(
    identifier: string,
    { size = "M", type = "olid" }: { size?: "S" | "M" | "L"; type?: "olid" | "id" } = {},
  ): Promise<File | null> {
    const filename = `${identifier}-${size}.jpg`;
    const url = new URL(`/a/${type}/${filename}?default=false`, this.#coversBaseUrl);

    return this.#loadImage(url, filename);
  }

  loadCoverMetadata(
    identifier: string,
    { type = "olid" }: { type?: "olid" | "isbn" | "oclc" | "lccn" | "id" } = {},
  ): Promise<ImageMetadata | null> {
    const url = new URL(`/b/${type}/${identifier}.json`, this.#coversBaseUrl);

    return this.loadOne<ImageMetadata>(url);
  }

  loadAuthorPhotoMetadata(
    identifier: string,
    { type = "olid" }: { type?: "olid" | "id" } = {},
  ): Promise<ImageMetadata | null> {
    const url = new URL(`/a/${type}/${identifier}.json`, this.#coversBaseUrl);

    return this.loadOne<ImageMetadata>(url);
  }

  async loadOne<T = unknown>(
    endpoint: string | URL,
    init?: RequestInit,
    readResponse?: ResponseReader<T>,
  ): Promise<T | null> {
    const request = new Request(new URL(endpoint, this.#baseUrl), init);
    request.headers.set("accept", "application/json");
    request.headers.set(
      "user-agent",
      `${packageJson.name}/${packageJson.version} (+${packageJson.homepage}); ${this.#userAgentInfo}`,
    );

    return await this.#request<T>(request, readResponse);
  }

  // endregion

  async *loadMany<T extends object = object>(
    endpoint: string | URL,
    { limit = defaultLimit, offset = 0 }: ListOptions = {},
    init?: RequestInit,
  ): AsyncGenerator<ListResponsePayload<T>> {
    const url = new URL(endpoint, this.#baseUrl);

    if (!url.searchParams.has("limit")) {
      url.searchParams.set("limit", String(limit));
    }

    if (!url.searchParams.has("offset")) {
      url.searchParams.set("offset", String(offset));
    }

    const request = new Request(url, init);
    const payload = await this.#request<ListResponsePayload<T>>(request);

    if (payload === null) {
      throw new Error(`OpenLibrary API Request failed: No data found for endpoint "${endpoint}"`);
    }

    yield payload;

    if (
      "links" in payload &&
      typeof payload.links === "object" &&
      payload.links !== null &&
      "next" in payload.links &&
      typeof payload.links.next === "string"
    ) {
      const nextUrl = payload.links.next;

      if (nextUrl) {
        yield* this.loadMany<T>(nextUrl);
      }
    }
  }

  // endregion

  #loadImage(url: URL, filename: string): Promise<File | null> {
    return this.loadOne(url, undefined, async (response) => {
      const blob = await response.blob();
      const type = response.headers.get("content-type") ?? "image/jpeg";
      const lastModified = response.headers.has("last-modified")
        ? new Date(response.headers.get("last-modified") as string).getTime()
        : Date.now();

      return new File([blob], filename, { lastModified, type });
    });
  }

  async *#search<
    T extends object,
    P extends SearchResultsResponsePayload<T> = SearchResultsResponsePayload<T>,
  >(
    endpoint: string | URL,
    query: string | SearchQuery<string>,
    params: { limit?: number | undefined; [key: string]: string | number | undefined },
  ) {
    const url = new URL(endpoint, this.#baseUrl);

    for (const [key, value] of Object.entries(params)) {
      if (typeof value !== "undefined") {
        url.searchParams.set(key, value.toString());
      }
    }

    url.searchParams.set(
      "q",
      typeof query !== "string" ? buildSearchQuery(query) : `"${query.replace(/"/g, "").trim()}"`,
    );

    const results = this.#loadSearchResults<T, P>(url);
    let resultCount = 0;

    for await (const result of results) {
      for (const document of result.docs) {
        resultCount++;

        yield document;

        if (params.limit && resultCount >= params.limit) {
          return;
        }
      }
    }
  }

  async *#loadSearchResults<
    T extends object = object,
    P extends SearchResultsResponsePayload<T> = SearchResultsResponsePayload<T>,
  >(endpoint: string | URL, init?: RequestInit) {
    let page = 0;
    let resultCount = 0;
    let max = Infinity;

    do {
      page++;
      const url = new URL(endpoint, this.#baseUrl);
      url.searchParams.set("page", String(page));
      const request = new Request(url, init);
      const response = await this.#request<P>(request);

      if (response === null) {
        throw new Error(`OpenLibrary API Request failed: No data found for endpoint "${endpoint}"`);
      }

      resultCount = response.docs.length;
      max = response.numFound || Infinity;
      yield response;
    } while (resultCount > 0 && resultCount > max);
  }

  async #request<T>(
    request: Request,
    readResponse: ResponseReader<T> = (response) => response.json() as Promise<T>,
  ): Promise<T | null> {
    let response: Response;

    try {
      response = await this.#fetch(request);
    } catch (error) {
      let cause = error;

      if (!(cause instanceof Error)) {
        cause = new Error(`Unknown Error: ${String(cause)}`, { cause });
      }

      throw new Error(`OpenLibrary API Request failed: ${(cause as Error).message}`, { cause });
    }

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(
        `OpenLibrary API Request failed: Request failed with status ${response.status} - ${response.statusText}`,
        { cause: response },
      );
    }

    let payload: T;

    try {
      payload = await readResponse(response);

      if (typeof payload !== "object" || payload === null) {
        throw new Error(
          `OpenLibrary API Request failed: Expected an object, but received ${typeof payload}: ${JSON.stringify(
            payload,
          )}`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      throw new Error(`OpenLibrary API Request failed: Invalid response format: ${message}`);
    }

    return payload;
  }
}

type ContactInfo = `${string}@${string}` | `+${number | "-" | " "}`;
type ClientOptions = {
  fetch?: Fetch;
  baseUrl?: `https://${string}` | `http://${string}` | URL;
  coversBaseUrl?: `https://${string}` | `http://${string}` | URL;
  applicationName?: string;
};

type Fetch = typeof globalThis.fetch;

type ResponseReader<T> = (response: Response) => Promise<T>;

type ListOptions = { limit?: number; offset?: number };

type ListResponsePayload<T> = {
  links?: { self: string; next: string; [key: string]: string };
  size: number;
  entries: T[];
};

type RatingsResponse = {
  summary: { average: number; count: number; sortable: number };
  counts: { "1": number; "2": number; "3": number; "4": number; "5": number };
};

type BookshelveStatsResponse = {
  counts: { want_to_read: number; currently_reading: number; already_read: number };
};

type ImageMetadata = {
  id: number;
  category_id: number;
  olid: string;
  filename: string;
  author: string;
  ip: string | null;
  source_url: string;
  source: string | null;
  isbn: string | null;
  created: string;
  last_modified: string;
  archived: boolean;
  failed: boolean;
  width: number;
  height: number;
  filename_s: string | null;
  filename_m: string | null;
  filename_l: string | null;
  isbn13: string | null;
  uploaded: boolean;
  deleted: boolean;
  filename_old: string | null;
};
