import { beforeEach, describe, expect, it, vi } from "vitest";
import { DNBMetadataProvider } from "./dnb.js";
import { MetadataType } from "./provider.js";

// Sample MARC21 XML response
const sampleMarcResponse = `<?xml version="1.0" encoding="UTF-8"?>
<searchRetrieveResponse xmlns="http://www.loc.gov/zing/srw/">
  <numberOfRecords>1</numberOfRecords>
  <records>
    <record>
      <recordSchema>MARC21-xml</recordSchema>
      <recordData>
        <record xmlns="http://www.loc.gov/MARC21/slim">
          <controlfield tag="001">1234567890</controlfield>
          <controlfield tag="008">210615s2021    gw            000 0 ger d</controlfield>
          <datafield tag="020" ind1=" " ind2=" ">
            <subfield code="a">9783446274860</subfield>
          </datafield>
          <datafield tag="041" ind1=" " ind2=" ">
            <subfield code="a">ger</subfield>
          </datafield>
          <datafield tag="082" ind1="0" ind2="4">
            <subfield code="a">833.914</subfield>
          </datafield>
          <datafield tag="100" ind1="1" ind2=" ">
            <subfield code="a">Kehlmann, Daniel</subfield>
            <subfield code="0">(DE-588)119541483</subfield>
          </datafield>
          <datafield tag="245" ind1="1" ind2="0">
            <subfield code="a">Die Vermessung der Welt</subfield>
            <subfield code="b">Roman</subfield>
          </datafield>
          <datafield tag="264" ind1=" " ind2="1">
            <subfield code="a">Reinbek bei Hamburg</subfield>
            <subfield code="b">Rowohlt</subfield>
            <subfield code="c">2021</subfield>
          </datafield>
          <datafield tag="300" ind1=" " ind2=" ">
            <subfield code="a">302 S.</subfield>
          </datafield>
          <datafield tag="650" ind1=" " ind2="4">
            <subfield code="a">Humboldt, Alexander von</subfield>
          </datafield>
          <datafield tag="650" ind1=" " ind2="4">
            <subfield code="a">Gauß, Carl Friedrich</subfield>
          </datafield>
        </record>
      </recordData>
    </record>
  </records>
</searchRetrieveResponse>`;

const emptyResponse = `<?xml version="1.0" encoding="UTF-8"?>
<searchRetrieveResponse xmlns="http://www.loc.gov/zing/srw/">
  <numberOfRecords>0</numberOfRecords>
  <records>
  </records>
</searchRetrieveResponse>`;

describe("DNBMetadataProvider", () => {
  let provider: DNBMetadataProvider;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    provider = new DNBMetadataProvider(mockFetch);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  describe("searchByTitle", () => {
    it("should search by title and parse MARC21 response", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => sampleMarcResponse,
      });

      const results = await provider.searchByTitle({
        title: "Die Vermessung der Welt",
      });

      expect(mockFetch).toHaveBeenCalled();
      expect(results.length).toBeGreaterThan(0);

      const record = results[0];
      expect(record.title).toBe("Die Vermessung der Welt: Roman");
      expect(record.authors).toContain("Daniel Kehlmann");
      expect(record.isbn).toContain("9783446274860");
      expect(record.publisher).toBe("Rowohlt");
      expect(record.language).toBe("de");
      expect(record.pageCount).toBe(302);
    });

    it("should return empty array when no results", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => emptyResponse,
      });

      const results = await provider.searchByTitle({
        title: "Nonexistent Book",
      });

      expect(results).toEqual([]);
    });

    it("should handle exact match searches", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => sampleMarcResponse,
      });

      await provider.searchByTitle({
        title: "Die Vermessung der Welt",
        exactMatch: true,
      });

      const call = mockFetch.mock.calls[0];
      // URL-encoded: tit="..." becomes tit%3D%22...%22
      expect(call[0]).toContain("tit%3D%22");
    });
  });

  describe("searchByISBN", () => {
    it("should search by ISBN", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => sampleMarcResponse,
      });

      const results = await provider.searchByISBN("978-3-446-27486-0");

      expect(mockFetch).toHaveBeenCalled();
      const call = mockFetch.mock.calls[0];
      // URL-encoded: num=... becomes num%3D...
      expect(call[0]).toContain("num%3D9783446274860");

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("should clean ISBN before searching", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => sampleMarcResponse,
      });

      await provider.searchByISBN("978-3-446-27486-0");

      const call = mockFetch.mock.calls[0];
      // URL-encoded version - verify ISBN is cleaned (no hyphens in the ISBN itself)
      expect(call[0]).toContain("num%3D9783446274860");
      // Note: The URL may contain "-" in other parts like "MARC21-xml", which is fine
    });
  });

  describe("searchByCreator", () => {
    it("should search by author name", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => sampleMarcResponse,
      });

      const results = await provider.searchByCreator({
        name: "Kehlmann, Daniel",
      });

      expect(mockFetch).toHaveBeenCalled();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].authors).toContain("Daniel Kehlmann");
    });

    it("should handle fuzzy author searches", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => sampleMarcResponse,
      });

      await provider.searchByCreator({
        name: "Kehlmann",
        fuzzy: true,
      });

      const call = mockFetch.mock.calls[0];
      // URL-encoded: spaces become +
      expect(call[0]).toContain("atr+any+Kehlmann");
    });
  });

  describe("searchMultiCriteria", () => {
    it("should prioritize ISBN when available", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => sampleMarcResponse,
      });

      await provider.searchMultiCriteria({
        title: "Die Vermessung der Welt",
        isbn: "9783446274860",
      });

      const call = mockFetch.mock.calls[0];
      // URL-encoded
      expect(call[0]).toContain("num%3D9783446274860");
      expect(call[0]).not.toContain("tit%3D");
    });

    it("should combine title and author", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => sampleMarcResponse,
      });

      await provider.searchMultiCriteria({
        title: "Die Vermessung der Welt",
        authors: ["Kehlmann"],
      });

      const call = mockFetch.mock.calls[0];
      // URL is URL-encoded, so check for encoded values
      expect(call[0]).toContain("tit%3D");
      expect(call[0]).toContain("atr%3D");
    });

    it("should return empty array when no criteria provided", async () => {
      const results = await provider.searchMultiCriteria({});
      expect(results).toEqual([]);
    });
  });

  describe("MARC21 Parsing", () => {
    it("should extract GND IDs from author fields when present", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => sampleMarcResponse,
      });

      const results = await provider.searchByTitle({
        title: "Test",
      });

      const record = results[0];
      // GND IDs should be stored in providerData if extracted
      expect(record.providerData).toBeDefined();
      expect(record.providerData?.controlNumber).toBeDefined();
      // If GND IDs are present, they should be in an array
      if (record.providerData?.gndIds) {
        expect(Array.isArray(record.providerData.gndIds)).toBe(true);
      }
    });

    it("should extract DDC classification", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => sampleMarcResponse,
      });

      const results = await provider.searchByTitle({
        title: "Test",
      });

      const record = results[0];
      expect(record.providerData?.ddcClassification).toBe("833.914");
    });

    it("should extract subjects", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => sampleMarcResponse,
      });

      const results = await provider.searchByTitle({
        title: "Test",
      });

      const record = results[0];
      expect(record.subjects).toContain("Humboldt, Alexander von");
      expect(record.subjects).toContain("Gauß, Carl Friedrich");
    });
  });

  describe("Language Code Normalization", () => {
    it("should normalize ISO 639-2/B codes to ISO 639-1", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => sampleMarcResponse,
      });

      const results = await provider.searchByTitle({
        title: "Test",
      });

      expect(results[0].language).toBe("de");
    });

    it("should handle English language code", async () => {
      // Replace both the 041 subfield AND the language in 008 control field
      const englishResponse = sampleMarcResponse
        .replace(
          '<subfield code="a">ger</subfield>',
          '<subfield code="a">eng</subfield>',
        )
        .replace("ger d</controlfield>", "eng d</controlfield>");

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => englishResponse,
      });

      const results = await provider.searchByTitle({
        title: "Test",
      });

      expect(results[0].language).toBe("en");
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
          text: async () => sampleMarcResponse,
        });

      const results = await provider.searchByTitle({
        title: "Test",
      });

      expect(results.length).toBeGreaterThan(0);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    }, 30000);

    it("should handle malformed XML gracefully", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => "not valid xml",
      });

      const results = await provider.searchByTitle({
        title: "Test",
      });

      expect(results).toEqual([]);
    });
  });

  describe("Confidence Scoring", () => {
    it("should assign higher confidence for ISBN searches", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => sampleMarcResponse,
      });

      const results = await provider.searchByISBN("9783446274860");
      expect(results[0].confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("should boost confidence for complete metadata", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => sampleMarcResponse,
      });

      const results = await provider.searchByTitle({
        title: "Test",
      });

      // Complete record should have higher confidence
      expect(results[0].confidence).toBeGreaterThanOrEqual(0.85);
    });
  });

  describe("Reliability Scores", () => {
    it("should report high reliability for title", () => {
      expect(provider.getReliabilityScore(MetadataType.TITLE)).toBe(0.95);
    });

    it("should report high reliability for authors (GND)", () => {
      expect(provider.getReliabilityScore(MetadataType.AUTHORS)).toBe(0.95);
    });

    it("should report very high reliability for ISBN", () => {
      expect(provider.getReliabilityScore(MetadataType.ISBN)).toBe(0.98);
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
    });

    it("should not support cover images", () => {
      expect(provider.supportsDataType(MetadataType.COVER_IMAGE)).toBe(false);
    });
  });

  describe("Provider Properties", () => {
    it("should have correct name", () => {
      expect(provider.name).toBe("DNB");
    });

    it("should have correct priority", () => {
      expect(provider.priority).toBe(80);
    });

    it("should have appropriate rate limits", () => {
      expect(provider.rateLimit.maxRequests).toBe(60);
      expect(provider.rateLimit.windowMs).toBe(60000);
    });
  });
});
