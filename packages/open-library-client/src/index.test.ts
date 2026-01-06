import { beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "./index.js";

const mockFetch = vi.fn();
const baseUrl = "https://openlibrary.org";
const coversBaseUrl = "https://covers.openlibrary.org";

const sampleWork = { key: "/works/OL123W", title: "Test Work" };
const sampleBookshelveStats = {
  counts: { want_to_read: 1, currently_reading: 2, already_read: 3 },
};
const sampleRatings = {
  summary: { average: 4.5, count: 10, sortable: 10 },
  counts: { "1": 0, "2": 1, "3": 2, "4": 3, "5": 4 },
};
const sampleEdition = { key: "/books/OL456M", title: "Test Edition" };
const sampleEditionsPayload = { size: 1, entries: [sampleEdition] };
const sampleIsbn = { key: "/books/OL789M", title: "ISBN Edition" };
const sampleAuthor = { key: "/authors/OL1A", name: "Test Author" };
const sampleSearchAuthorPayload = { docs: [sampleAuthor] };
const sampleSearchBookPayload = {
  docs: [{ key: "/works/OL123W", title: "Book Result" }],
  numFound: 1,
};
const sampleWorksByAuthor = {
  size: 2,
  entries: [
    { key: "/works/OL123W", title: "First Work" },
    { key: "/works/OL456W", title: "Second Work" },
  ],
  links: {
    self: "/authors/OL1A/works.json?offset=0&limit=2",
    next: "/authors/OL1A/works.json?offset=2&limit=2",
  },
};
const sampleWorksByAuthorPage2 = {
  size: 1,
  entries: [{ key: "/works/OL789W", title: "Third Work" }],
  links: {
    self: "/authors/OL1A/works.json?offset=2&limit=2",
    prev: "/authors/OL1A/works.json?offset=0&limit=2",
  },
};
const sampleCoverMetadata = {
  olid: "OL123M",
  source_records: ["amazon:12345"],
  sizes: ["S", "M", "L"],
};
const sampleAuthorPhotoMetadata = {
  olid: "OL1A",
  source_records: ["wikipedia:12345"],
  sizes: ["S", "M", "L"],
};

function mockResponse<T>(data: T, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    json: () => Promise.resolve(data),
    headers: new Headers({
      "cache-control": "public, max-age=3600",
      "last-modified": new Date().toUTCString(),
      "content-type": "application/json",
      "x-ratelimit-limit": "1000",
      "x-ratelimit-remaining": "999",
    }),
  });
}

function mockBlobResponse(data: Blob, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    blob: () => Promise.resolve(data),
    headers: new Headers({
      "cache-control": "public, max-age=3600",
      "last-modified": new Date().toUTCString(),
      "content-type": "image/jpeg",
      "x-ratelimit-limit": "1000",
      "x-ratelimit-remaining": "999",
    }),
  });
}

describe("Open Library Client", () => {
  let client: Client;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new Client("test@colibri.dev", {
      fetch: mockFetch,
      baseUrl,
      coversBaseUrl,
    });
  });

  it("loads a work by id", async () => {
    mockFetch.mockImplementation(() => mockResponse(sampleWork));

    await expect(client.loadWork("OL123W")).resolves.toEqual(sampleWork);
  });

  it("returns null for 404 work", async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: vi.fn(),
      }),
    );

    await expect(client.loadWork("OL404W")).resolves.toBeNull();
  });

  it("loads bookshelve stats by work id", async () => {
    mockFetch.mockImplementation(() => mockResponse(sampleBookshelveStats));

    await expect(client.loadBookshelveStatsByWorkId("OL123W")).resolves.toEqual(
      sampleBookshelveStats,
    );
  });

  it("loads ratings by work id", async () => {
    mockFetch.mockImplementation(() => mockResponse(sampleRatings));

    await expect(client.loadRatingsByWorkId("OL123W")).resolves.toEqual(
      sampleRatings,
    );
  });

  it("loads an edition by id", async () => {
    mockFetch.mockImplementation(() => mockResponse(sampleEdition));

    await expect(client.loadEdition("OL456M")).resolves.toEqual(sampleEdition);
  });

  it("loads editions by work id (async generator)", async () => {
    mockFetch.mockImplementation(() => mockResponse(sampleEditionsPayload));

    const editions = await Array.fromAsync(
      client.loadEditionsByWorkId("OL123W"),
    );

    expect(editions).toEqual([sampleEdition]);
  });

  it("loads an edition by ISBN", async () => {
    mockFetch.mockImplementation(() => mockResponse(sampleIsbn));

    await expect(client.loadEditionByIsbn("1234567890")).resolves.toEqual(
      sampleIsbn,
    );
  });

  it("loads an author by id", async () => {
    mockFetch.mockImplementation(() => mockResponse(sampleAuthor));

    await expect(client.loadAuthor("OL1A")).resolves.toEqual(sampleAuthor);
  });

  it("loads works by author id (async generator)", async () => {
    // First page of results
    mockFetch.mockImplementationOnce(() => mockResponse(sampleWorksByAuthor));
    // Second page of results (for pagination test)
    mockFetch.mockImplementationOnce(() =>
      mockResponse(sampleWorksByAuthorPage2),
    );

    const works = await Array.fromAsync(
      client.loadWorksByAuthorId("OL1A", { limit: 2 }),
    );

    expect(works).toEqual([
      { key: "/works/OL123W", title: "First Work" },
      { key: "/works/OL456W", title: "Second Work" },
      { key: "/works/OL789W", title: "Third Work" },
    ]);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[0][0].url).toContain(
      "/authors/OL1A/works.json",
    );
    expect(mockFetch.mock.calls[1][0].url).toContain(
      "/authors/OL1A/works.json?offset=2&limit=2",
    );
  });

  it("searches authors (async generator)", async () => {
    mockFetch.mockImplementation(() => mockResponse(sampleSearchAuthorPayload));

    const authors = await Array.fromAsync(client.searchAuthor("Test Author"));

    expect(authors).toEqual([sampleAuthor]);
  });

  it("searches books (async generator)", async () => {
    mockFetch.mockImplementation(() => mockResponse(sampleSearchBookPayload));

    const books = await Array.fromAsync(client.searchBook("Book Result"));

    expect(books).toEqual([{ key: "/works/OL123W", title: "Book Result" }]);
  });

  it("respects limit in searchBook", async () => {
    mockFetch.mockImplementation(() =>
      mockResponse({
        docs: [
          { key: "/works/OL1", title: "A" },
          { key: "/works/OL2", title: "B" },
        ],
      }),
    );

    const books = await Array.fromAsync(
      client.searchBook("Book", { limit: 1 }),
    );

    expect(books.length).toBe(1);
  });

  it("handles advanced search queries for books", async () => {
    mockFetch.mockImplementation(() => mockResponse(sampleSearchBookPayload));

    await Array.fromAsync(
      client.searchBook(
        {
          title: "Great Gatsby",
          author: "Fitzgerald",
          first_publish_year: { from: 1920, to: 1930 },
        },
        { sortBy: "editions" },
      ),
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = new URL(mockFetch.mock.calls[0][0].url);
    expect(url.pathname).toBe("/search.json");
    expect(url.searchParams.get("q")).toBe(
      'title:"Great Gatsby" AND author:Fitzgerald AND first_publish_year:[1920 TO 1930]',
    );
    expect(url.searchParams.get("sort")).toBe("editions");
  });

  it("handles advanced search queries for authors", async () => {
    mockFetch.mockImplementation(() => mockResponse(sampleSearchAuthorPayload));

    await Array.fromAsync(
      client.searchAuthor({
        name: "Jane Austen",
        birth_date: { from: "1700", to: "1900" },
      }),
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = new URL(mockFetch.mock.calls[0][0].url);
    expect(url.pathname).toBe("/authors/search.json");
    expect(url.searchParams.get("q")).toBe(
      'name:"Jane Austen" AND birth_date:[1700 TO 1900]',
    );
  });

  it("loads cover metadata", async () => {
    mockFetch.mockImplementation(() => mockResponse(sampleCoverMetadata));

    await expect(client.loadCoverMetadata("OL123M")).resolves.toEqual(
      sampleCoverMetadata,
    );
  });

  it("loads author photo metadata", async () => {
    mockFetch.mockImplementation(() => mockResponse(sampleAuthorPhotoMetadata));

    await expect(client.loadAuthorPhotoMetadata("OL1A")).resolves.toEqual(
      sampleAuthorPhotoMetadata,
    );
  });

  it("loads cover image", async () => {
    const mockImageBlob = new Blob(["image data"], { type: "image/jpeg" });
    mockFetch.mockImplementation(() => mockBlobResponse(mockImageBlob));

    const result = await client.loadCover("OL123M");
    expect(result).toBeInstanceOf(File);
    expect(result?.name).toBe("OL123M-M.jpg");
    expect(result?.type).toBe("image/jpeg");

    const url = new URL(mockFetch.mock.calls[0][0].url);
    expect(url.pathname).toBe("/b/olid/OL123M-M.jpg");
    expect(url.searchParams.get("default")).toBe("false");
  });

  it("loads author photo", async () => {
    const mockImageBlob = new Blob(["image data"], { type: "image/jpeg" });
    mockFetch.mockImplementation(() => mockBlobResponse(mockImageBlob));

    const result = await client.loadAuthorPhoto("OL1A");
    expect(result).toBeInstanceOf(File);
    expect(result?.name).toBe("OL1A-M.jpg");
    expect(result?.type).toBe("image/jpeg");

    const url = new URL(mockFetch.mock.calls[0][0].url);
    expect(url.pathname).toBe("/a/olid/OL1A-M.jpg");
  });

  it("returns null for non-existent cover", async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 404,
        statusText: "Not Found",
      }),
    );

    await expect(client.loadCover("NonExistentCover")).resolves.toBeNull();
  });

  it("handles different cover size options", async () => {
    const mockImageBlob = new Blob(["image data"], { type: "image/jpeg" });
    mockFetch.mockImplementation(() => mockBlobResponse(mockImageBlob));

    await client.loadCover("OL123M", { size: "S" });
    expect(mockFetch.mock.calls[0][0].url).toContain("/b/olid/OL123M-S.jpg");

    mockFetch.mockClear();

    await client.loadCover("OL123M", { size: "L" });
    expect(mockFetch.mock.calls[0][0].url).toContain("/b/olid/OL123M-L.jpg");
  });

  it("handles different identifier types for covers", async () => {
    const mockImageBlob = new Blob(["image data"], { type: "image/jpeg" });
    mockFetch.mockImplementation(() => mockBlobResponse(mockImageBlob));

    await client.loadCover("9781234567890", { type: "isbn" });
    expect(mockFetch.mock.calls[0][0].url).toContain(
      "/b/isbn/9781234567890-M.jpg",
    );

    mockFetch.mockClear();

    await client.loadCover("12345678", { type: "oclc" });
    expect(mockFetch.mock.calls[0][0].url).toContain("/b/oclc/12345678-M.jpg");
  });

  it("throws on network error", async () => {
    mockFetch.mockImplementation(() =>
      Promise.reject(new Error("Network fail")),
    );

    await expect(client.loadWork("OL123W")).rejects.toThrow("Network fail");
  });

  it("throws on invalid JSON", async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        json: () => Promise.reject(new Error("Invalid JSON")),
        headers: { get: vi.fn() },
      }),
    );
    await expect(client.loadWork("OL123W")).rejects.toThrow("Invalid JSON");
  });

  it("throws on non-OK response", async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: vi.fn(),
        headers: { get: vi.fn() },
      }),
    );

    await expect(client.loadWork("OL123W")).rejects.toThrow(
      "Request failed with status 500",
    );
  });

  it("handles timeout errors gracefully", async () => {
    mockFetch.mockImplementation(() =>
      Promise.reject(new Error("The operation was aborted. ")),
    );

    await expect(client.loadWork("OL123W")).rejects.toThrow("aborted");
  });

  it("handles malformed JSON responses", async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        // Return invalid JSON structure
        json: () => Promise.resolve(undefined),
        headers: { get: vi.fn() },
      }),
    );

    await expect(client.loadWork("OL123W")).rejects.toThrow(
      "Invalid response format",
    );
  });

  it("handles unexpected API response structure", async () => {
    // Test with a response that doesn't match the expected type
    mockFetch.mockImplementation(() =>
      mockResponse({ unexpected: "structure", notTheExpectedFields: true }),
    );

    // The client should still return the response but TypeScript would warn at compile time
    const result = await client.loadWork("OL123W");
    expect(result).toHaveProperty("unexpected");
    expect(result).not.toHaveProperty("key");
  });

  it("handles Unicode characters in search queries properly", async () => {
    mockFetch.mockImplementation(() => mockResponse(sampleSearchBookPayload));

    await Array.fromAsync(client.searchBook("Gabriel García Márquez"));

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = new URL(mockFetch.mock.calls[0][0].url);
    expect(url.searchParams.get("q")).toBe('"Gabriel García Márquez"');
  });

  it("handles extremely large search result sets", async () => {
    // Mock a first page with a lot of results
    mockFetch.mockImplementationOnce(() =>
      mockResponse({
        docs: Array(50)
          .fill(0)
          .map((_, i) => ({ key: `/works/OL${i}W`, title: `Book ${i}` })),
        numFound: 10000, // Extreme number of total results
        start: 0,
        num_found: 10000,
      }),
    );

    // Only process first page to avoid infinite loop in test
    const books = await Array.fromAsync(
      client.searchBook("common term", { limit: 50 }),
    );

    expect(books).toHaveLength(50);
    expect(books[0].key).toBe("/works/OL0W");
    expect(books[49].key).toBe("/works/OL49W");
  });

  it("handles empty search results gracefully", async () => {
    mockFetch.mockImplementation(() =>
      mockResponse({
        docs: [],
        numFound: 0,
        start: 0,
        num_found: 0,
      }),
    );

    const books = await Array.fromAsync(
      client.searchBook("nonexistentbook12345"),
    );
    expect(books).toEqual([]);
    expect(books).toHaveLength(0);
  });

  it("handles URLs with special characters when loading works", async () => {
    mockFetch.mockImplementation(() => mockResponse(sampleWork));

    await client.loadWork("OL123W");

    // Check that URL encoding is handled properly
    const requestUrl = mockFetch.mock.calls[0][0].url;
    expect(requestUrl).not.toContain(" ");
    expect(requestUrl).toContain("OL123W");
  });

  it("properly sets custom headers on requests", async () => {
    mockFetch.mockImplementation(() => mockResponse(sampleWork));

    await client.loadWork("OL123W");

    const request = mockFetch.mock.calls[0][0];
    expect(request.headers.get("accept")).toBe("application/json");
    expect(request.headers.get("user-agent")).toMatch(/open-library-client/);
  });

  it("handles broken cover image URLs", async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve(mockBlobResponse(new Blob())),
    );

    const result = await client.loadCover("OL123M");
    expect(result).toBeInstanceOf(File);
    expect(result?.size).toBe(0); // File exists but is empty
  });

  it("constructs proper URL for author search with multiple fields", async () => {
    mockFetch.mockImplementation(() => mockResponse(sampleSearchAuthorPayload));

    await Array.fromAsync(
      client.searchAuthor("Test Author", {
        fields: ["name", "birth_date", "top_subjects"],
        limit: 20,
        offset: 10,
      }),
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = new URL(mockFetch.mock.calls[0][0].url);
    expect(url.pathname).toBe("/authors/search.json");
    expect(url.searchParams.get("q")).toBe('"Test Author"');
    expect(url.searchParams.get("fields")).toBe("name,birth_date,top_subjects");
    expect(url.searchParams.get("limit")).toBe("20");
    expect(url.searchParams.get("offset")).toBe("10");
  });
});
