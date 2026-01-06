import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AmazonPaapiMetadataProvider } from "./amazon.js";
import { MetadataType } from "./provider.js";

describe("AmazonPaapiMetadataProvider", () => {
  let provider: AmazonPaapiMetadataProvider;
  let mockFetch: ReturnType<typeof vi.fn>;

  const mockConfig = {
    region: "us" as const,
    accessKey: "AKIAIOSFODNN7EXAMPLE",
    secretKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    partnerTag: "test-partner-20",
  };

  beforeEach(() => {
    mockFetch = vi.fn();
    provider = new AmazonPaapiMetadataProvider(mockConfig, mockFetch);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Provider Configuration", () => {
    it("should have correct metadata", () => {
      expect(provider.name).toBe("Amazon");
      expect(provider.priority).toBe(90);
    });

    it("should have appropriate rate limits", () => {
      expect(provider.rateLimit.maxRequests).toBe(60);
      expect(provider.rateLimit.windowMs).toBe(60000);
      expect(provider.rateLimit.requestDelay).toBe(1000);
    });

    it("should have appropriate timeouts", () => {
      expect(provider.timeout.requestTimeout).toBe(10000);
      expect(provider.timeout.operationTimeout).toBe(30000);
    });
  });

  describe("Reliability Scores", () => {
    it("should return high reliability scores for supported data types", () => {
      expect(provider.getReliabilityScore(MetadataType.TITLE)).toBe(0.95);
      expect(provider.getReliabilityScore(MetadataType.AUTHORS)).toBe(0.92);
      expect(provider.getReliabilityScore(MetadataType.ISBN)).toBe(0.98);
      expect(provider.getReliabilityScore(MetadataType.COVER_IMAGE)).toBe(0.98);
      expect(provider.getReliabilityScore(MetadataType.PAGE_COUNT)).toBe(0.92);
    });

    it("should support key data types", () => {
      expect(provider.supportsDataType(MetadataType.TITLE)).toBe(true);
      expect(provider.supportsDataType(MetadataType.AUTHORS)).toBe(true);
      expect(provider.supportsDataType(MetadataType.ISBN)).toBe(true);
      expect(provider.supportsDataType(MetadataType.COVER_IMAGE)).toBe(true);
      expect(provider.supportsDataType(MetadataType.PUBLICATION_DATE)).toBe(
        true,
      );
      expect(provider.supportsDataType(MetadataType.PAGE_COUNT)).toBe(true);
      expect(provider.supportsDataType(MetadataType.LANGUAGE)).toBe(true);
      expect(provider.supportsDataType(MetadataType.EDITION)).toBe(true);
    });

    it("should not support subjects (Amazon limitation)", () => {
      expect(provider.supportsDataType(MetadataType.SUBJECTS)).toBe(false);
    });
  });

  describe("searchByISBN", () => {
    it("should search by ISBN and return results", async () => {
      const mockResponse = {
        ItemsResult: {
          Items: [
            {
              ASIN: "B001234567",
              ItemInfo: {
                Title: { DisplayValue: "Test Book" },
                ByLineInfo: {
                  Contributors: [{ Name: "John Doe", Role: "Author" }],
                },
                ContentInfo: {
                  PagesCount: { DisplayValue: 350 },
                  Languages: {
                    DisplayValues: [{ DisplayValue: "English" }],
                  },
                },
                ProductInfo: {
                  ReleaseDate: { DisplayValue: "2020-01-15T00:00:00.000Z" },
                },
                Classifications: {
                  Binding: { DisplayValue: "Paperback" },
                },
              },
              Images: {
                Primary: {
                  Large: {
                    URL: "https://example.com/cover-large.jpg",
                    Width: 500,
                    Height: 750,
                  },
                },
              },
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await provider.searchByISBN("978-0-123456-78-9");

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Test Book");
      expect(results[0].authors).toEqual(["John Doe"]);
      expect(results[0].pageCount).toBe(350);
      expect(results[0].language).toBe("en");
      expect(results[0].edition).toBe("Paperback");
      expect(results[0].coverImage).toEqual({
        url: "https://example.com/cover-large.jpg",
        width: 500,
        height: 750,
      });
      expect(results[0].publicationDate).toBeInstanceOf(Date);
      expect(results[0].confidence).toBeGreaterThanOrEqual(0.95);
    });

    it("should handle ISBN with hyphens and spaces", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ItemsResult: { Items: [] } }),
      });

      await provider.searchByISBN("978-0-123-45678-9");

      expect(mockFetch).toHaveBeenCalled();
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.ItemIds).toEqual(["9780123456789"]);
      expect(requestBody.ItemIdType).toBe("ISBN");
    });

    it("should return empty array for no results", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ItemsResult: { Items: [] } }),
      });

      const results = await provider.searchByISBN("978-0-000000-00-0");
      expect(results).toEqual([]);
    });

    it("should filter out items without required fields", async () => {
      const mockResponse = {
        ItemsResult: {
          Items: [
            { ASIN: "B001234567" }, // Missing ItemInfo
            { ItemInfo: { Title: { DisplayValue: "Test" } } }, // Missing ASIN
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await provider.searchByISBN("978-0-123456-78-9");
      expect(results).toEqual([]);
    });
  });

  describe("searchByTitle", () => {
    it("should search by title and return results", async () => {
      const mockResponse = {
        SearchResult: {
          Items: [
            {
              ASIN: "B001234567",
              ItemInfo: {
                Title: { DisplayValue: "The Great Book" },
                ByLineInfo: {
                  Contributors: [
                    { Name: "Jane Smith", Role: "Author" },
                    { Name: "John Editor", Role: "Editor" },
                  ],
                },
                ProductInfo: {
                  ReleaseDate: { DisplayValue: "2019-05-20T00:00:00.000Z" },
                },
              },
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await provider.searchByTitle({
        title: "The Great Book",
      });

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("The Great Book");
      expect(results[0].authors).toEqual(["Jane Smith"]); // Only authors, not editors
      expect(results[0].confidence).toBeGreaterThanOrEqual(0.8);
    });

    it("should handle multiple results", async () => {
      const mockResponse = {
        SearchResult: {
          Items: [
            {
              ASIN: "B001234567",
              ItemInfo: { Title: { DisplayValue: "Book One" } },
            },
            {
              ASIN: "B007654321",
              ItemInfo: { Title: { DisplayValue: "Book Two" } },
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await provider.searchByTitle({ title: "Book" });
      expect(results).toHaveLength(2);
    });
  });

  describe("searchByCreator", () => {
    it("should search by author name", async () => {
      const mockResponse = {
        SearchResult: {
          Items: [
            {
              ASIN: "B001234567",
              ItemInfo: {
                Title: { DisplayValue: "Author's Book" },
                ByLineInfo: {
                  Contributors: [{ Name: "Famous Author", Role: "Author" }],
                },
              },
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await provider.searchByCreator({ name: "Famous Author" });

      expect(results).toHaveLength(1);
      expect(results[0].authors).toContain("Famous Author");
    });

    it("should prefix search with 'author:' keyword", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ SearchResult: { Items: [] } }),
      });

      await provider.searchByCreator({ name: "Test Author" });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.Keywords).toBe("author:Test Author");
    });
  });

  describe("searchMultiCriteria", () => {
    it("should prioritize ISBN when available", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ItemsResult: { Items: [] } }),
      });

      await provider.searchMultiCriteria({
        isbn: "978-0-123456-78-9",
        title: "Test Book",
        authors: ["Test Author"],
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.ItemIds).toBeDefined();
      expect(requestBody.ItemIdType).toBe("ISBN");
    });

    it("should combine title and author when ISBN not available", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ SearchResult: { Items: [] } }),
      });

      await provider.searchMultiCriteria({
        title: "Test Book",
        authors: ["Test Author"],
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.Keywords).toBe("Test Book Test Author");
      expect(requestBody.SearchIndex).toBe("Books");
    });

    it("should fall back to title search", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ SearchResult: { Items: [] } }),
      });

      await provider.searchMultiCriteria({ title: "Test Book" });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.Keywords).toBe("Test Book");
    });

    it("should fall back to author search", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ SearchResult: { Items: [] } }),
      });

      await provider.searchMultiCriteria({ authors: ["Test Author"] });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.Keywords).toBe("author:Test Author");
    });

    it("should return empty array when no criteria provided", async () => {
      const results = await provider.searchMultiCriteria({});
      expect(results).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("AWS Signature V4", () => {
    it("should include proper headers for signed requests", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ItemsResult: { Items: [] } }),
      });

      await provider.searchByISBN("978-0-123456-78-9");

      expect(mockFetch).toHaveBeenCalled();
      const headers = mockFetch.mock.calls[0][1].headers;

      expect(headers["Content-Type"]).toBe("application/json; charset=utf-8");
      expect(headers["X-Amz-Date"]).toMatch(/^\d{8}T\d{6}Z$/);
      expect(headers["X-Amz-Target"]).toContain("ProductAdvertisingAPIv1");
      expect(headers.Authorization).toContain("AWS4-HMAC-SHA256");
      expect(headers.Authorization).toContain("Credential=");
      expect(headers.Authorization).toContain("SignedHeaders=");
      expect(headers.Authorization).toContain("Signature=");
    });

    it("should use correct endpoint for region", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ItemsResult: { Items: [] } }),
      });

      await provider.searchByISBN("978-0-123456-78-9");

      expect(mockFetch).toHaveBeenCalled();
      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("webservices.amazon.com");
    });

    it("should use different endpoint for UK region", async () => {
      const ukProvider = new AmazonPaapiMetadataProvider(
        {
          ...mockConfig,
          region: "uk",
        },
        mockFetch,
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ItemsResult: { Items: [] } }),
      });

      await ukProvider.searchByISBN("978-0-123456-78-9");

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("webservices.amazon.co.uk");
    });
  });

  describe("Error Handling", () => {
    it("should handle HTTP errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        text: async () => "Invalid credentials",
      });

      const results = await provider.searchByISBN("978-0-123456-78-9");

      expect(results).toEqual([]);
    });

    it("should handle API errors in response", async () => {
      const errorResponse = {
        Errors: [
          {
            Code: "InvalidPartnerTag",
            Message: "The partner tag is invalid",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => errorResponse,
      });

      const results = await provider.searchByISBN("978-0-123456-78-9");

      expect(results).toEqual([]);
    });

    it("should handle network errors with retry", async () => {
      mockFetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ItemsResult: { Items: [] } }),
        });

      const results = await provider.searchByISBN("978-0-123456-78-9");

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(results).toEqual([]);
    }, 10000); // 10 second timeout for retry test

    it("should handle timeout errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("TimeoutError"));

      const results = await provider.searchByISBN("978-0-123456-78-9");

      expect(results).toEqual([]);
    });

    it("should return empty array when not configured", async () => {
      const unconfiguredProvider = new AmazonPaapiMetadataProvider(
        {},
        mockFetch,
      );

      const results =
        await unconfiguredProvider.searchByISBN("978-0-123456-78-9");

      expect(results).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("Cover Images", () => {
    it("should prefer Large images over Medium", async () => {
      const mockResponse = {
        ItemsResult: {
          Items: [
            {
              ASIN: "B001234567",
              ItemInfo: { Title: { DisplayValue: "Test Book" } },
              Images: {
                Primary: {
                  Large: {
                    URL: "https://example.com/large.jpg",
                    Width: 500,
                    Height: 750,
                  },
                  Medium: {
                    URL: "https://example.com/medium.jpg",
                    Width: 250,
                    Height: 375,
                  },
                },
              },
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await provider.searchByISBN("978-0-123456-78-9");

      expect(results[0].coverImage).toEqual({
        url: "https://example.com/large.jpg",
        width: 500,
        height: 750,
      });
    });

    it("should use Medium image if Large not available", async () => {
      const mockResponse = {
        ItemsResult: {
          Items: [
            {
              ASIN: "B001234567",
              ItemInfo: { Title: { DisplayValue: "Test Book" } },
              Images: {
                Primary: {
                  Medium: {
                    URL: "https://example.com/medium.jpg",
                    Width: 250,
                    Height: 375,
                  },
                },
              },
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await provider.searchByISBN("978-0-123456-78-9");

      expect(results[0].coverImage).toEqual({
        url: "https://example.com/medium.jpg",
        width: 250,
        height: 375,
      });
    });

    it("should handle missing cover images gracefully", async () => {
      const mockResponse = {
        ItemsResult: {
          Items: [
            {
              ASIN: "B001234567",
              ItemInfo: { Title: { DisplayValue: "Test Book" } },
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await provider.searchByISBN("978-0-123456-78-9");

      expect(results[0].coverImage).toBeUndefined();
    });
  });

  describe("Language Mapping", () => {
    it("should map language names to ISO codes", async () => {
      const languages = [
        { name: "English", code: "en" },
        { name: "German", code: "de" },
        { name: "French", code: "fr" },
        { name: "Spanish", code: "es" },
      ];

      for (const { name, code } of languages) {
        const mockResponse = {
          ItemsResult: {
            Items: [
              {
                ASIN: "B001234567",
                ItemInfo: {
                  Title: { DisplayValue: "Test Book" },
                  ContentInfo: {
                    Languages: { DisplayValues: [{ DisplayValue: name }] },
                  },
                },
              },
            ],
          },
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const results = await provider.searchByISBN("978-0-123456-78-9");
        expect(results[0].language).toBe(code);
      }
    });
  });

  describe("Confidence Scoring", () => {
    it("should assign higher confidence for ISBN searches", async () => {
      const mockResponse = {
        ItemsResult: {
          Items: [
            {
              ASIN: "B001234567",
              ItemInfo: {
                Title: { DisplayValue: "Test Book" },
                ByLineInfo: {
                  Contributors: [{ Name: "Author", Role: "Author" }],
                },
              },
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await provider.searchByISBN("978-0-123456-78-9");

      expect(results[0].confidence).toBeGreaterThanOrEqual(0.95);
    });

    it("should boost confidence for complete metadata", async () => {
      const completeItem = {
        ASIN: "B001234567",
        ItemInfo: {
          Title: { DisplayValue: "Complete Book" },
          ByLineInfo: {
            Contributors: [{ Name: "Author", Role: "Author" }],
          },
          ProductInfo: { ReleaseDate: { DisplayValue: "2020-01-01" } },
          ContentInfo: {
            PagesCount: { DisplayValue: 300 },
            Languages: { DisplayValues: [{ DisplayValue: "English" }] },
          },
        },
        Images: {
          Primary: { Large: { URL: "https://example.com/cover.jpg" } },
        },
      };

      const incompleteItem = {
        ASIN: "B001234567",
        ItemInfo: {
          Title: { DisplayValue: "Incomplete Book" },
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ItemsResult: { Items: [completeItem] } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ItemsResult: { Items: [incompleteItem] } }),
        });

      const completeResults = await provider.searchByISBN("978-0-123456-78-9");
      const incompleteResults =
        await provider.searchByISBN("978-0-000000-00-0");

      expect(completeResults[0].confidence).toBeGreaterThan(
        incompleteResults[0].confidence,
      );
    });
  });

  describe("Provider Data", () => {
    it("should store provider-specific data", async () => {
      const mockResponse = {
        ItemsResult: {
          Items: [
            {
              ASIN: "B001234567",
              ItemInfo: {
                Title: { DisplayValue: "Test Book" },
                Classifications: { Binding: { DisplayValue: "Hardcover" } },
              },
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await provider.searchByISBN("978-0-123456-78-9");

      expect(results[0].providerData).toEqual({
        asin: "B001234567",
        region: "us",
        binding: "Hardcover",
        searchType: "isbn",
        searchTerm: "978-0-123456-78-9",
      });
    });
  });

  describe("Date Parsing", () => {
    it("should parse valid ISO date strings", async () => {
      const mockResponse = {
        ItemsResult: {
          Items: [
            {
              ASIN: "B001234567",
              ItemInfo: {
                Title: { DisplayValue: "Test Book" },
                ProductInfo: {
                  ReleaseDate: { DisplayValue: "2020-06-15T00:00:00.000Z" },
                },
              },
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await provider.searchByISBN("978-0-123456-78-9");

      expect(results[0].publicationDate).toBeInstanceOf(Date);
      expect(results[0].publicationDate?.getFullYear()).toBe(2020);
      expect(results[0].publicationDate?.getMonth()).toBe(5); // June (0-indexed)
    });

    it("should handle invalid dates gracefully", async () => {
      const mockResponse = {
        ItemsResult: {
          Items: [
            {
              ASIN: "B001234567",
              ItemInfo: {
                Title: { DisplayValue: "Test Book" },
                ProductInfo: { ReleaseDate: { DisplayValue: "invalid-date" } },
              },
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const results = await provider.searchByISBN("978-0-123456-78-9");

      expect(results[0].publicationDate).toBeUndefined();
    });
  });
});
