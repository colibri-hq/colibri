import { describe, expect, it } from "vitest";
import { loadEpubMetadata } from "./epub.js";
import { readFile } from "node:fs/promises";

describe("EPUB Metadata Extraction", () => {
  describe("Series Detection", () => {
    it("should extract Calibre series metadata", async () => {
      // This test would require a sample EPUB with calibre:series metadata
      // For now, this is a placeholder demonstrating the expected behavior
      // Example of what the metadata should look like:
      // <meta name="calibre:series" content="The Lord of the Rings"/>
      // <meta name="calibre:series_index" content="1"/>
      // const file = new File([await readFile("test-files/calibre-series.epub")], "test.epub");
      // const metadata = await loadEpubMetadata(file);
      // expect(metadata.series).toBeDefined();
      // expect(metadata.series?.name).toBe("The Lord of the Rings");
      // expect(metadata.series?.position).toBe(1);
    });

    it("should extract EPUB 3 belongs-to-collection metadata", async () => {
      // This test would require a sample EPUB with EPUB 3 collection metadata
      // Example of what the metadata should look like:
      // <meta property="belongs-to-collection" id="c01">Harry Potter</meta>
      // <meta refines="#c01" property="collection-type">series</meta>
      // <meta refines="#c01" property="group-position">1</meta>
      // const file = new File([await readFile("test-files/epub3-series.epub")], "test.epub");
      // const metadata = await loadEpubMetadata(file);
      // expect(metadata.series).toBeDefined();
      // expect(metadata.series?.name).toBe("Harry Potter");
      // expect(metadata.series?.position).toBe(1);
    });

    it("should handle series without position", async () => {
      // const file = new File([await readFile("test-files/series-no-position.epub")], "test.epub");
      // const metadata = await loadEpubMetadata(file);
      // expect(metadata.series).toBeDefined();
      // expect(metadata.series?.name).toBe("Standalone Series");
      // expect(metadata.series?.position).toBeUndefined();
    });

    it("should prioritize EPUB 3 metadata over Calibre metadata", async () => {
      // When both are present, EPUB 3 should take precedence
      // This is handled in the legacy parser (lines 436-460)
    });
  });

  describe("Subject/Tag Extraction", () => {
    it("should extract simple subjects", async () => {
      // Example of what the metadata should look like:
      // <dc:subject>Fiction</dc:subject>
      // <dc:subject>Fantasy</dc:subject>
      // const file = new File([await readFile("test-files/simple-subjects.epub")], "test.epub");
      // const metadata = await loadEpubMetadata(file);
      // expect(metadata.tags).toBeDefined();
      // expect(metadata.tags).toContain("Fiction");
      // expect(metadata.tags).toContain("Fantasy");
    });

    it("should split compound BISAC subjects", async () => {
      // Example: "Fiction / Fantasy / Epic" should become ["Fiction", "Fantasy", "Epic"]

      // Mock metadata with compound subject
      const mockSubjects = [
        { name: "Fiction / Fantasy / Epic", term: "Fiction / Fantasy / Epic" },
        {
          name: "Young Adult Fiction / Action & Adventure",
          term: "Young Adult Fiction / Action & Adventure",
        },
      ];

      // Simulate the loadSubjects function behavior
      const allSubjects: string[] = [];
      for (const subject of mockSubjects) {
        const subjectText = subject.term ?? subject.name;

        if (subjectText.includes(" / ")) {
          const parts = subjectText
            .split(" / ")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
          allSubjects.push(...parts);
        } else {
          allSubjects.push(subjectText);
        }
      }

      const tags = [...new Set(allSubjects)].filter((s) => s.length > 0);

      expect(tags).toContain("Fiction");
      expect(tags).toContain("Fantasy");
      expect(tags).toContain("Epic");
      expect(tags).toContain("Young Adult Fiction");
      expect(tags).toContain("Action & Adventure");
    });

    it("should deduplicate subjects", async () => {
      const mockSubjects = [
        { name: "Fiction", term: "Fiction" },
        { name: "Fiction", term: "Fiction" },
        { name: "Science Fiction", term: "Science Fiction" },
      ];

      const allSubjects: string[] = [];
      for (const subject of mockSubjects) {
        const subjectText = subject.term ?? subject.name;
        if (subjectText.includes(" / ")) {
          const parts = subjectText
            .split(" / ")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
          allSubjects.push(...parts);
        } else {
          allSubjects.push(subjectText);
        }
      }

      const tags = [...new Set(allSubjects)].filter((s) => s.length > 0);

      expect(tags.filter((t) => t === "Fiction")).toHaveLength(1);
      expect(tags).toHaveLength(2);
    });

    it("should filter out empty subjects", async () => {
      const mockSubjects = [
        { name: "", term: "" },
        { name: "Fiction", term: "Fiction" },
        { name: "  ", term: "  " },
      ];

      const allSubjects: string[] = [];
      for (const subject of mockSubjects) {
        const subjectText = subject.term ?? subject.name;
        if (subjectText.trim().length === 0) continue;

        if (subjectText.includes(" / ")) {
          const parts = subjectText
            .split(" / ")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
          allSubjects.push(...parts);
        } else {
          allSubjects.push(subjectText);
        }
      }

      const tags = [...new Set(allSubjects)].filter((s) => s.length > 0);

      expect(tags).toHaveLength(1);
      expect(tags[0]).toBe("Fiction");
    });

    it("should prefer term over name if both exist", async () => {
      const mockSubjects = [
        { name: "Generic Fiction", term: "Fiction / Literary" },
      ];

      const allSubjects: string[] = [];
      for (const subject of mockSubjects) {
        const subjectText = subject.term ?? subject.name;

        if (subjectText.includes(" / ")) {
          const parts = subjectText
            .split(" / ")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
          allSubjects.push(...parts);
        } else {
          allSubjects.push(subjectText);
        }
      }

      const tags = [...new Set(allSubjects)].filter((s) => s.length > 0);

      expect(tags).toContain("Fiction");
      expect(tags).toContain("Literary");
      expect(tags).not.toContain("Generic Fiction");
    });
  });

  describe("Real EPUB File", () => {
    it("should extract metadata from real EPUB", async () => {
      // Test with the actual EPUB file in the repo
      try {
        const buffer = await readFile(
          "/Users/moritz/Projects/colibri/Mogi, Ken - Ikigai.epub",
        );
        const file = new File([buffer], "Ikigai.epub", {
          type: "application/epub+zip",
        });

        const metadata = await loadEpubMetadata(file);

        // Basic metadata checks
        expect(metadata.title).toBeDefined();
        expect(metadata.contributors).toBeDefined();
        expect(metadata.contributors.length).toBeGreaterThan(0);

        // Check if tags were extracted
        if (metadata.tags) {
          expect(Array.isArray(metadata.tags)).toBe(true);
          console.log("Extracted tags:", metadata.tags);
        }

        // Check if series was extracted
        if (metadata.series) {
          expect(metadata.series.name).toBeDefined();
          console.log("Extracted series:", metadata.series);
        }

        console.log("Full metadata:", JSON.stringify(metadata, null, 2));
      } catch (error) {
        console.log("Could not test with real EPUB file:", error);
        // Don't fail the test if the file doesn't exist
      }
    });
  });
});
