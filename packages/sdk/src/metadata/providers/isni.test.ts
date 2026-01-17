import { beforeEach, describe, expect, it, vi } from "vitest";
import { ISNIMetadataProvider } from "./isni.js";
import { MetadataType } from "./provider.js";

// Mock fetch function
const mockFetch = vi.fn();

describe("ISNIMetadataProvider", () => {
  let provider: ISNIMetadataProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new ISNIMetadataProvider(mockFetch);
  });

  describe("Basic Properties", () => {
    it("should have correct name and priority", () => {
      expect(provider.name).toBe("ISNI");
      expect(provider.priority).toBe(70);
    });

    it("should have appropriate rate limiting configuration", () => {
      expect(provider.rateLimit.maxRequests).toBe(50);
      expect(provider.rateLimit.windowMs).toBe(60000);
      expect(provider.rateLimit.requestDelay).toBe(500);
    });

    it("should have appropriate timeout configuration", () => {
      expect(provider.timeout.requestTimeout).toBe(20000);
      expect(provider.timeout.operationTimeout).toBe(60000);
    });
  });

  describe("Reliability Scores", () => {
    it("should return high reliability scores for creator data", () => {
      expect(provider.getReliabilityScore(MetadataType.AUTHORS)).toBe(0.95);
      expect(provider.getReliabilityScore(MetadataType.SUBJECTS)).toBe(0.7);
    });

    it("should return low reliability scores for unsupported data types", () => {
      expect(provider.getReliabilityScore(MetadataType.ISBN)).toBe(0.3);
      expect(provider.getReliabilityScore(MetadataType.PAGE_COUNT)).toBe(0.1);
      expect(provider.getReliabilityScore(MetadataType.COVER_IMAGE)).toBe(0.05);
    });

    it("should return moderate scores for partially supported types", () => {
      expect(provider.getReliabilityScore(MetadataType.TITLE)).toBe(0.6);
      expect(provider.getReliabilityScore(MetadataType.LANGUAGE)).toBe(0.6);
    });
  });

  describe("Data Type Support", () => {
    it("should support creator-focused metadata types", () => {
      expect(provider.supportsDataType(MetadataType.AUTHORS)).toBe(true);
      expect(provider.supportsDataType(MetadataType.SUBJECTS)).toBe(true);
      expect(provider.supportsDataType(MetadataType.TITLE)).toBe(true);
      expect(provider.supportsDataType(MetadataType.LANGUAGE)).toBe(true);
      expect(provider.supportsDataType(MetadataType.PUBLICATION_DATE)).toBe(true);
    });

    it("should not support book-specific metadata types", () => {
      expect(provider.supportsDataType(MetadataType.ISBN)).toBe(false);
      expect(provider.supportsDataType(MetadataType.PAGE_COUNT)).toBe(false);
      expect(provider.supportsDataType(MetadataType.COVER_IMAGE)).toBe(false);
      expect(provider.supportsDataType(MetadataType.PHYSICAL_DIMENSIONS)).toBe(false);
    });
  });

  describe("Search Methods", () => {
    const mockISNIResponse = {
      responseHeader: { status: 0, QTime: 123 },
      response: {
        numFound: 1,
        start: 0,
        docs: [
          {
            ISN: "0000000121032683",
            nameType: "Personal",
            forename: "John Ronald Reuel",
            surname: "Tolkien",
            marcDate: "1892-1973",
            creationClass: "am",
            creationRole: "aut",
            source: "BNF|verified",
            titleOfWork: ["The Hobbit", "The Lord of the Rings"],
            languageOfWork: ["eng"],
            formOfWork: ["novel"],
            subjectOfWork: ["Fantasy literature", "Adventure stories"],
            externalInformation: [
              { URI: "https://en.wikipedia.org/wiki/J._R._R._Tolkien", information: "Wikipedia" },
            ],
            otherIdentifierOfWork: [{ type: "ISBN", value: "9780547928227" }],
          },
        ],
      },
    };

    beforeEach(() => {
      mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => mockISNIResponse });
    });

    describe("searchByTitle", () => {
      it("should search by title with exact match", async () => {
        const results = await provider.searchByTitle({ title: "The Hobbit", exactMatch: true });

        const fetchCall = mockFetch.mock.calls[0][0] as string;
        expect(fetchCall).toContain("local.title%3D%22%22The+Hobbit%22%22");
        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              Accept: "application/json",
              "User-Agent": "colibri-metadata-discovery/1.0",
            }),
          }),
        );
        expect(results).toHaveLength(1);
        expect(results[0].title).toBe("The Hobbit");
        expect(results[0].source).toBe("ISNI");
        expect(results[0].authors).toEqual(["John Ronald Reuel Tolkien"]);
      });

      it("should search by title with fuzzy match", async () => {
        const results = await provider.searchByTitle({ title: "Hobbit", fuzzy: true });

        const fetchCall = mockFetch.mock.calls[0][0] as string;
        expect(fetchCall).toContain("local.title%3D%22Hobbit%22");
        expect(results).toHaveLength(1);
      });

      it("should handle search errors gracefully", async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        });

        const results = await provider.searchByTitle({ title: "Nonexistent Book" });

        expect(results).toHaveLength(0);
      }, 20000);
    });

    describe("searchByISBN", () => {
      it("should search by ISBN and clean the input", async () => {
        const results = await provider.searchByISBN("978-0-547-92822-7");

        const fetchCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0] as string;
        expect(fetchCall).toContain("local.otherIdentifierOfWork%3D%229780547928227%22");
        expect(results).toHaveLength(1);
        expect(results[0].providerData?.otherIdentifiers).toEqual([
          { type: "ISBN", value: "9780547928227" },
        ]);
      });

      it("should return low confidence for ISBN searches", async () => {
        const results = await provider.searchByISBN("9780547928227");
        expect(results[0].confidence).toBeLessThan(0.7); // ISBN searches have low confidence in ISNI
      });
    });

    describe("searchByCreator", () => {
      it("should search by creator with exact match", async () => {
        const results = await provider.searchByCreator({ name: "J.R.R. Tolkien", fuzzy: false });

        const fetchCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1][0] as string;
        expect(fetchCall).toContain(
          "local.forename%3D%22J.R.R.%22+AND+local.surname%3D%22Tolkien%22",
        );
        expect(results).toHaveLength(1);
        expect(results[0].authors).toEqual(["John Ronald Reuel Tolkien"]);
        expect(results[0].confidence).toBeGreaterThan(0.8); // Creator searches should have high confidence
      });

      it("should search by creator with fuzzy match", async () => {
        const results = await provider.searchByCreator({ name: "Tolkien", fuzzy: true });

        const fetchCall = mockFetch.mock.calls[0][0] as string;
        expect(fetchCall).toContain("local.personalName%3D%22Tolkien%22");
        expect(results).toHaveLength(1);
      });

      it("should include role filter when specified", async () => {
        const results = await provider.searchByCreator({
          name: "J.R.R. Tolkien",
          role: "author",
          fuzzy: false,
        });

        const fetchCall = mockFetch.mock.calls[0][0] as string;
        expect(fetchCall).toContain("local.creationRole%3D%22aut%22");
        expect(results).toHaveLength(1);
      });

      it("should handle single name correctly", async () => {
        const results = await provider.searchByCreator({ name: "Tolkien", fuzzy: false });

        const fetchCall = mockFetch.mock.calls[0][0] as string;
        expect(fetchCall).toContain("local.personalName%3D%22Tolkien%22");
        expect(results).toHaveLength(1);
      });
    });

    describe("searchMultiCriteria", () => {
      it("should build complex search query from multiple criteria", async () => {
        const results = await provider.searchMultiCriteria({
          title: "The Hobbit",
          authors: ["J.R.R. Tolkien"],
          language: "eng",
          subjects: ["Fantasy"],
          fuzzy: false,
        });

        const fetchCall = mockFetch.mock.calls[0][0] as string;
        expect(fetchCall).toContain("local.title%3D%22The+Hobbit%22");
        expect(fetchCall).toContain("local.personalName%3D%22J.R.R.+Tolkien%22");
        expect(fetchCall).toContain("local.languageOfWork%3D%22eng%22");
        expect(fetchCall).toContain("local.subjectOfWork%3D%22Fantasy%22");
        expect(results).toHaveLength(1);
      });

      it("should use fuzzy matching when specified", async () => {
        const results = await provider.searchMultiCriteria({
          title: "Hobbit",
          authors: ["Tolkien"],
          fuzzy: true,
        });

        const fetchCall = mockFetch.mock.calls[0][0] as string;
        expect(fetchCall).toContain("local.title%3DHobbit");
        expect(fetchCall).toContain("local.personalName%3DTolkien");
        expect(results).toHaveLength(1);
      });

      it("should return empty array when no valid criteria provided", async () => {
        const results = await provider.searchMultiCriteria({
          isbn: "1234567890", // ISBN alone is not sufficient for ISNI multi-criteria
        });

        expect(results).toHaveLength(0);
      });
    });
  });

  describe("Metadata Mapping", () => {
    it("should correctly map ISNI record to MetadataRecord", async () => {
      const mockResult = {
        ISN: "0000000121032683",
        nameType: "Personal",
        forename: "John Ronald Reuel",
        surname: "Tolkien",
        marcDate: "1892-1973",
        creationClass: "am",
        creationRole: "aut",
        source: "BNF|verified",
        titleOfWork: ["The Hobbit", "The Lord of the Rings"],
        languageOfWork: ["eng"],
        formOfWork: ["novel"],
        subjectOfWork: ["Fantasy literature", "Adventure stories"],
        externalInformation: [
          { URI: "https://en.wikipedia.org/wiki/J._R._R._Tolkien", information: "Wikipedia" },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          responseHeader: { status: 0, QTime: 123 },
          response: { numFound: 1, start: 0, docs: [mockResult] },
        }),
      });

      const results = await provider.searchByCreator({ name: "Tolkien" });
      const record = results[0];

      expect(record.authors).toEqual(["John Ronald Reuel Tolkien"]);
      expect(record.title).toBe("The Hobbit");
      expect(record.language).toBe("eng");
      expect(record.subjects).toEqual(["Fantasy literature", "Adventure stories"]);
      expect(record.publicationDate).toEqual(new Date(1892, 0, 1)); // Parsed from marcDate
      expect(record.providerData).toMatchObject({
        isni: "0000000121032683",
        nameType: "Personal",
        creationClass: "am",
        creationRole: "aut",
        source: "BNF|verified",
        formOfWork: ["novel"],
      });
    });

    it("should handle missing fields gracefully", async () => {
      const mockResult = { ISN: "0000000121032683", nameType: "Personal", surname: "Tolkien" };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          responseHeader: { status: 0, QTime: 123 },
          response: { numFound: 1, start: 0, docs: [mockResult] },
        }),
      });

      const results = await provider.searchByCreator({ name: "Tolkien" });
      const record = results[0];

      expect(record.authors).toEqual(["Tolkien"]);
      expect(record.title).toBeUndefined();
      expect(record.language).toBeUndefined();
      expect(record.subjects).toBeUndefined();
      expect(record.providerData?.isni).toBe("0000000121032683");
    });

    it("should handle name variations correctly", async () => {
      const mockResultWithForenameOnly = { ISN: "0000000121032683", forename: "John" };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          responseHeader: { status: 0, QTime: 123 },
          response: { numFound: 1, start: 0, docs: [mockResultWithForenameOnly] },
        }),
      });

      const results = await provider.searchByCreator({ name: "John" });
      const record = results[0];

      expect(record.authors).toEqual(["John"]);
    });
  });

  describe("Confidence Calculation", () => {
    it("should assign higher confidence to creator searches", async () => {
      const mockResult = {
        ISN: "0000000121032683",
        forename: "John",
        surname: "Tolkien",
        creationRole: "aut",
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          responseHeader: { status: 0, QTime: 123 },
          response: { numFound: 1, start: 0, docs: [mockResult] },
        }),
      });

      const results = await provider.searchByCreator({ name: "Tolkien" });
      expect(results[0].confidence).toBeGreaterThan(0.8);
    });

    it("should boost confidence for complete metadata", async () => {
      const completeResult = {
        ISN: "0000000121032683",
        forename: "John",
        surname: "Tolkien",
        marcDate: "1892-1973",
        creationClass: "am",
        creationRole: "aut",
        titleOfWork: ["The Hobbit"],
        languageOfWork: ["eng"],
        subjectOfWork: ["Fantasy"],
      };

      const incompleteResult = {
        ISN: "0000000121032684",
        surname: "Smith",
        source: "local",
        // Missing most fields - much less complete than the first result
      };

      // Test complete result
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          responseHeader: { status: 0, QTime: 123 },
          response: { numFound: 1, start: 0, docs: [completeResult] },
        }),
      });
      const completeResults = await provider.searchByCreator({ name: "Tolkien" });

      // Reset mock for incomplete result
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          responseHeader: { status: 0, QTime: 123 },
          response: { numFound: 1, start: 0, docs: [incompleteResult] },
        }),
      });
      const incompleteResults = await provider.searchByCreator({ name: "Smith" });

      // Complete result should have higher confidence due to more complete data
      expect(completeResults[0].confidence).toBeGreaterThan(0.9);
      expect(incompleteResults[0].confidence).toBeGreaterThan(0.7);
      expect(incompleteResults[0].confidence).toBeLessThan(1.0);
    });

    it("should boost confidence for verified sources", async () => {
      const verifiedResult = {
        ISN: "0000000121032683",
        forename: "John",
        surname: "Tolkien",
        marcDate: "1892-1973",
        creationClass: "am",
        creationRole: "aut",
        source: "BNF|verified",
        titleOfWork: ["The Hobbit"],
      };

      const unverifiedResult = { ISN: "0000000121032684", surname: "Smith", source: "local" };

      // Test verified result
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          responseHeader: { status: 0, QTime: 123 },
          response: { numFound: 1, start: 0, docs: [verifiedResult] },
        }),
      });
      const verifiedResults = await provider.searchByCreator({ name: "Tolkien" });

      // Reset mock for unverified result
      mockFetch.mockClear();
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          responseHeader: { status: 0, QTime: 123 },
          response: { numFound: 1, start: 0, docs: [unverifiedResult] },
        }),
      });
      const unverifiedResults = await provider.searchByCreator({ name: "Smith" });

      expect(verifiedResults[0].confidence).toBeGreaterThan(0.9);
      expect(unverifiedResults[0].confidence).toBeLessThan(1.0);
      expect(verifiedResults[0].confidence).toBeGreaterThanOrEqual(unverifiedResults[0].confidence);
    });
  });

  describe("Error Handling and Resilience", () => {
    // Don't use fake timers for these tests as they interfere with the retry logic

    it("should handle network errors gracefully with retry", async () => {
      let attemptCount = 0;
      mockFetch.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error("Network error: ECONNRESET");
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            responseHeader: { status: 0, QTime: 123 },
            response: {
              numFound: 1,
              start: 0,
              docs: [{ ISN: "0000000121032683", surname: "Recovered" }],
            },
          }),
        };
      });

      const results = await provider.searchByCreator({ name: "Test" });

      expect(results).toHaveLength(1);
      expect(results[0].authors).toEqual(["Recovered"]);
      expect(attemptCount).toBe(3);
    }, 15000);

    it("should handle API errors gracefully", async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500, statusText: "Internal Server Error" });

      const results = await provider.searchByCreator({ name: "Test" });

      expect(results).toHaveLength(0);
    }, 15000);

    it("should handle malformed JSON responses", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      });

      const results = await provider.searchByCreator({ name: "Test" });

      expect(results).toHaveLength(0);
    }, 15000);

    it("should handle empty responses correctly", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          responseHeader: { status: 0, QTime: 123 },
          response: { numFound: 0, start: 0, docs: [] },
        }),
      });

      const results = await provider.searchByCreator({ name: "Nonexistent" });
      expect(results).toHaveLength(0);
    }, 10000);
  });
});
