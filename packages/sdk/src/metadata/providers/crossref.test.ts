import { beforeEach, describe, expect, it, vi } from "vitest";
import { CrossrefMetadataProvider } from "./crossref.js";
import { MetadataType } from "./provider.js";

// Sample Crossref API response for a book
const sampleBookResponse = {
  status: "ok",
  "message-type": "work-list",
  message: {
    items: [
      {
        DOI: "10.1093/acprof:oso/9780199588381.001.0001",
        type: "book",
        title: ["The Oxford Handbook of Philosophy of Mind"],
        subtitle: ["A Comprehensive Guide"],
        author: [
          {
            given: "Brian",
            family: "McLaughlin",
            ORCID: "https://orcid.org/0000-0001-2345-6789",
            sequence: "first",
          },
          { given: "Ansgar", family: "Beckermann", sequence: "additional" },
        ],
        publisher: "Oxford University Press",
        "published-print": { "date-parts": [[2009, 8, 27]] },
        ISBN: ["9780199588381", "9780199262618"],
        abstract:
          "<jats:p>This handbook provides a comprehensive overview of the philosophy of mind...</jats:p>",
        subject: ["Philosophy", "Philosophy of Mind", "Cognitive Science"],
        language: "en",
        "page-count": 816,
        "references-count": 250,
        "is-referenced-by-count": 156,
        funder: [
          { name: "National Science Foundation", DOI: "10.13039/100000001" },
        ],
        license: [{ URL: "https://creativecommons.org/licenses/by/4.0/" }],
      },
    ],
    "total-results": 1,
  },
};

const sampleSingleWorkResponse = {
  status: "ok",
  "message-type": "work",
  message: {
    DOI: "10.1007/978-3-030-12345-6",
    type: "monograph",
    title: ["Advanced Machine Learning"],
    author: [{ name: "Research Group on ML" }],
    publisher: "Springer",
    "published-online": { "date-parts": [[2023, 5, 15]] },
    ISBN: ["9783030123456"],
    subject: ["Computer Science", "Machine Learning"],
    "page-count": 450,
  },
};

const emptyResponse = {
  status: "ok",
  "message-type": "work-list",
  message: {
    items: [],
    "total-results": 0,
  },
};

const nonBookResponse = {
  status: "ok",
  "message-type": "work-list",
  message: {
    items: [
      {
        DOI: "10.1234/journal.article.123",
        type: "journal-article",
        title: ["Some Journal Article"],
        author: [{ given: "John", family: "Doe" }],
        publisher: "Some Publisher",
      },
    ],
    "total-results": 1,
  },
};

describe("CrossrefMetadataProvider", () => {
  let provider: CrossrefMetadataProvider;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    provider = new CrossrefMetadataProvider(mockFetch);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  describe("searchByTitle", () => {
    it("should search by title and return metadata records", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      const results = await provider.searchByTitle({
        title: "Oxford Handbook Philosophy Mind",
      });

      expect(mockFetch).toHaveBeenCalled();
      expect(results.length).toBeGreaterThan(0);

      const record = results[0];
      expect(record.title).toBe(
        "The Oxford Handbook of Philosophy of Mind: A Comprehensive Guide",
      );
      expect(record.authors).toContain("McLaughlin, Brian");
      expect(record.authors).toContain("Beckermann, Ansgar");
      expect(record.isbn).toContain("9780199588381");
      expect(record.publisher).toBe("Oxford University Press");
      expect(record.language).toBe("en");
      expect(record.pageCount).toBe(816);
    });

    it("should include mailto parameter for polite pool", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      await provider.searchByTitle({ title: "Test" });

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("mailto=");
    });

    it("should filter for book types only", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      await provider.searchByTitle({ title: "Test" });

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("filter=type%3Abook");
    });

    it("should return empty array when no results", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => emptyResponse,
      });

      const results = await provider.searchByTitle({
        title: "Nonexistent Book",
      });

      expect(results).toEqual([]);
    });

    it("should filter out non-book types", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => nonBookResponse,
      });

      const results = await provider.searchByTitle({
        title: "Some Article",
      });

      expect(results).toEqual([]);
    });
  });

  describe("searchByISBN", () => {
    it("should search by ISBN", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      const results = await provider.searchByISBN("978-0-19-958838-1");

      expect(mockFetch).toHaveBeenCalled();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("should clean ISBN before searching", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      await provider.searchByISBN("978-0-19-958838-1");

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("isbn%3A9780199588381");
    });
  });

  describe("searchByDOI", () => {
    it("should resolve DOI directly", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleSingleWorkResponse,
      });

      const results = await provider.searchByDOI("10.1007/978-3-030-12345-6");

      expect(mockFetch).toHaveBeenCalled();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toBe("Advanced Machine Learning");
      expect(results[0].confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("should handle doi.org URL format", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleSingleWorkResponse,
      });

      await provider.searchByDOI("https://doi.org/10.1007/978-3-030-12345-6");

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("/works/10.1007%2F978-3-030-12345-6");
    });

    it("should handle organization names as authors", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleSingleWorkResponse,
      });

      const results = await provider.searchByDOI("10.1007/978-3-030-12345-6");

      expect(results[0].authors).toContain("Research Group on ML");
    });
  });

  describe("searchByCreator", () => {
    it("should search by author name", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      const results = await provider.searchByCreator({
        name: "McLaughlin",
      });

      expect(mockFetch).toHaveBeenCalled();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].authors).toContain("McLaughlin, Brian");
    });

    it("should use query.author parameter", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      await provider.searchByCreator({ name: "McLaughlin" });

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("query.author=McLaughlin");
    });
  });

  describe("searchMultiCriteria", () => {
    it("should prioritize ISBN when available", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      await provider.searchMultiCriteria({
        title: "Philosophy of Mind",
        isbn: "9780199588381",
      });

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("isbn%3A9780199588381");
    });

    it("should combine title and author", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      await provider.searchMultiCriteria({
        title: "Philosophy of Mind",
        authors: ["McLaughlin"],
      });

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("query.title=Philosophy");
      expect(call[0]).toContain("query.author=McLaughlin");
    });

    it("should include publisher in search", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      await provider.searchMultiCriteria({
        title: "Handbook",
        publisher: "Oxford",
      });

      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain("query.publisher-name=Oxford");
    });

    it("should return empty array when no criteria provided", async () => {
      const results = await provider.searchMultiCriteria({});
      expect(results).toEqual([]);
    });
  });

  describe("Provider Data", () => {
    it("should include DOI in provider data", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      const results = await provider.searchByTitle({ title: "Test" });

      expect(results[0].providerData?.doi).toBe(
        "10.1093/acprof:oso/9780199588381.001.0001",
      );
    });

    it("should include citation counts in provider data", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      const results = await provider.searchByTitle({ title: "Test" });

      expect(results[0].providerData?.referencesCount).toBe(250);
      expect(results[0].providerData?.citedByCount).toBe(156);
    });

    it("should include funder information", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      const results = await provider.searchByTitle({ title: "Test" });

      expect(results[0].providerData?.funders).toContain(
        "National Science Foundation",
      );
    });

    it("should include license URL", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      const results = await provider.searchByTitle({ title: "Test" });

      expect(results[0].providerData?.license).toBe(
        "https://creativecommons.org/licenses/by/4.0/",
      );
    });
  });

  describe("Abstract Cleaning", () => {
    it("should remove JATS markup from abstract", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      const results = await provider.searchByTitle({ title: "Test" });

      expect(results[0].description).not.toContain("<jats:p>");
      expect(results[0].description).not.toContain("</jats:p>");
      expect(results[0].description).toContain("comprehensive overview");
    });
  });

  describe("Date Parsing", () => {
    it("should parse full date from published-print", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      const results = await provider.searchByTitle({ title: "Test" });

      const pubDate = results[0].publicationDate;
      expect(pubDate).toBeDefined();
      expect(pubDate?.getFullYear()).toBe(2009);
      expect(pubDate?.getMonth()).toBe(7); // August (0-indexed)
    });

    it("should fall back to published-online", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleSingleWorkResponse,
      });

      const results = await provider.searchByDOI("10.1007/test");

      const pubDate = results[0].publicationDate;
      expect(pubDate).toBeDefined();
      expect(pubDate?.getFullYear()).toBe(2023);
    });
  });

  describe("Error Handling", () => {
    it("should handle HTTP errors gracefully", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const results = await provider.searchByTitle({
        title: "Test",
      });

      expect(results).toEqual([]);
    }, 30000);

    it("should handle network errors with retry", async () => {
      mockFetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValue({
          ok: true,
          json: async () => sampleBookResponse,
        });

      const results = await provider.searchByTitle({
        title: "Test",
      });

      expect(results.length).toBeGreaterThan(0);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    }, 30000);

    it("should handle JSON parse errors gracefully", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      const results = await provider.searchByTitle({
        title: "Test",
      });

      expect(results).toEqual([]);
    });
  });

  describe("Confidence Scoring", () => {
    it("should assign highest confidence for DOI searches", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleSingleWorkResponse,
      });

      const results = await provider.searchByDOI("10.1007/test");
      expect(results[0].confidence).toBeGreaterThanOrEqual(0.95);
    });

    it("should assign high confidence for ISBN searches", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      const results = await provider.searchByISBN("9780199588381");
      expect(results[0].confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("should boost confidence for complete metadata", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => sampleBookResponse,
      });

      const results = await provider.searchByTitle({ title: "Test" });

      // Complete record should have higher confidence
      expect(results[0].confidence).toBeGreaterThanOrEqual(0.75);
    });
  });

  describe("Reliability Scores", () => {
    it("should report high reliability for title", () => {
      expect(provider.getReliabilityScore(MetadataType.TITLE)).toBe(0.92);
    });

    it("should report high reliability for authors", () => {
      expect(provider.getReliabilityScore(MetadataType.AUTHORS)).toBe(0.9);
    });

    it("should report very high reliability for ISBN", () => {
      expect(provider.getReliabilityScore(MetadataType.ISBN)).toBe(0.95);
    });

    it("should report very high reliability for publisher", () => {
      expect(provider.getReliabilityScore(MetadataType.PUBLISHER)).toBe(0.95);
    });

    it("should report zero for cover images (not supported)", () => {
      expect(provider.getReliabilityScore(MetadataType.COVER_IMAGE)).toBe(0.0);
    });
  });

  describe("Supported Data Types", () => {
    it("should support core metadata types", () => {
      expect(provider.supportsDataType(MetadataType.TITLE)).toBe(true);
      expect(provider.supportsDataType(MetadataType.AUTHORS)).toBe(true);
      expect(provider.supportsDataType(MetadataType.ISBN)).toBe(true);
      expect(provider.supportsDataType(MetadataType.PUBLICATION_DATE)).toBe(
        true,
      );
      expect(provider.supportsDataType(MetadataType.DESCRIPTION)).toBe(true);
    });

    it("should not support cover images", () => {
      expect(provider.supportsDataType(MetadataType.COVER_IMAGE)).toBe(false);
    });

    it("should not support physical dimensions", () => {
      expect(provider.supportsDataType(MetadataType.PHYSICAL_DIMENSIONS)).toBe(
        false,
      );
    });
  });

  describe("Provider Properties", () => {
    it("should have correct name", () => {
      expect(provider.name).toBe("Crossref");
    });

    it("should have correct priority", () => {
      expect(provider.priority).toBe(70);
    });

    it("should have appropriate rate limits for polite pool", () => {
      expect(provider.rateLimit.maxRequests).toBe(50);
      expect(provider.rateLimit.windowMs).toBe(1000);
    });
  });
});
