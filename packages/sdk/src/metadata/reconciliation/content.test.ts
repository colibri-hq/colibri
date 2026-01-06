import { describe, expect, it } from "vitest";
import { ContentReconciler } from "./content.js";
import type {
  ContentDescriptionInput,
  CoverImage,
  Description,
  MetadataSource,
  Review,
  TableOfContents,
} from "./types.js";

describe("ContentReconciler", () => {
  const reconciler = new ContentReconciler();

  const createSource = (name: string, reliability: number): MetadataSource => ({
    name,
    reliability,
    timestamp: new Date(),
  });

  const highReliabilitySource = createSource("Publisher Official", 0.9);
  const mediumReliabilitySource = createSource("Library Database", 0.7);
  const lowReliabilitySource = createSource("User Generated", 0.4);

  describe("normalizeDescription", () => {
    it("should normalize string descriptions", () => {
      const result = reconciler.normalizeDescription(
        "This is a great book about adventure.",
      );

      expect(result.text).toBe("This is a great book about adventure.");
      expect(result.type).toBe("blurb");
      expect(result.length).toBe("short");
      expect(result.quality).toBeGreaterThan(0);
    });

    it("should clean description text", () => {
      const dirtyText =
        "  Description: This is a <b>great</b> book &amp; it's amazing!  \n\n\n  ";
      const result = reconciler.normalizeDescription(dirtyText);

      expect(result.text).toBe("This is a great book & it's amazing!");
    });

    it("should detect description types", () => {
      expect(
        reconciler.normalizeDescription("Synopsis: A tale of adventure").type,
      ).toBe("synopsis");
      expect(
        reconciler.normalizeDescription("Summary: This book covers...").type,
      ).toBe("summary");
      expect(
        reconciler.normalizeDescription("Short promotional text").type,
      ).toBe("blurb");
    });

    it("should detect description lengths", () => {
      const shortText = "Short description.";
      const mediumText =
        "This is a medium length description that provides a good overview of the book content and gives readers a sense of what to expect from the story without being too long or too brief. It contains enough detail to be informative while remaining concise and readable for potential readers who want to understand what the book is about.";
      const longText =
        "This is a very long description that goes into great detail about the book, its characters, plot, themes, and everything else you might want to know. ".repeat(
          10,
        );

      expect(reconciler.normalizeDescription(shortText).length).toBe("short");
      expect(reconciler.normalizeDescription(mediumText).length).toBe("medium");
      expect(reconciler.normalizeDescription(longText).length).toBe("long");
    });

    it("should handle Description objects", () => {
      const description: Description = {
        text: "A wonderful story",
        type: "summary",
        length: "medium",
        quality: 0.8,
        source: "publisher",
      };

      const result = reconciler.normalizeDescription(description);
      expect(result).toEqual(
        expect.objectContaining({
          text: "A wonderful story",
          type: "summary",
          length: "medium",
          quality: 0.8,
          source: "publisher",
        }),
      );
    });
  });

  describe("normalizeTableOfContents", () => {
    it("should parse string table of contents", () => {
      const tocString = `Chapter 1: Introduction .... 1
Chapter 2: The Journey .... 15
Chapter 3: Conclusion .... 30`;

      const result = reconciler.normalizeTableOfContents(tocString);

      expect(result.entries).toHaveLength(3);
      expect(result.entries[0]).toEqual({
        title: "Introduction",
        page: 1,
        level: 0,
      });
      expect(result.entries[1]).toEqual({
        title: "The Journey",
        page: 15,
        level: 0,
      });
      expect(result.pageNumbers).toBe(true);
      expect(result.format).toBe("detailed");
    });

    it("should handle simple table of contents without page numbers", () => {
      const tocString = `Introduction
The Journey
Conclusion`;

      const result = reconciler.normalizeTableOfContents(tocString);

      expect(result.entries).toHaveLength(3);
      expect(result.entries[0].title).toBe("Introduction");
      expect(result.entries[0].page).toBeUndefined();
      expect(result.pageNumbers).toBe(false);
      expect(result.format).toBe("simple");
    });

    it("should handle TableOfContents objects", () => {
      const toc: TableOfContents = {
        entries: [
          { title: "Chapter 1", page: 1, level: 0 },
          { title: "Chapter 2", page: 20, level: 0 },
        ],
        format: "detailed",
        pageNumbers: true,
      };

      const result = reconciler.normalizeTableOfContents(toc);
      expect(result.entries).toHaveLength(2);
      expect(result.format).toBe("detailed");
      expect(result.pageNumbers).toBe(true);
    });
  });

  describe("normalizeCoverImage", () => {
    it("should normalize string URLs", () => {
      const result = reconciler.normalizeCoverImage(
        "https://example.com/cover.jpg",
      );

      expect(result.url).toBe("https://example.com/cover.jpg");
      expect(result.format).toBe("jpeg");
      expect(result.quality).toBe("medium");
      expect(result.verified).toBe(false);
    });

    it("should detect image formats", () => {
      expect(reconciler.normalizeCoverImage("test.png").format).toBe("png");
      expect(reconciler.normalizeCoverImage("test.webp").format).toBe("webp");
      expect(reconciler.normalizeCoverImage("test.gif").format).toBe("gif");
      expect(reconciler.normalizeCoverImage("test.unknown").format).toBe(
        "other",
      );
    });

    it("should handle CoverImage objects", () => {
      const image: CoverImage = {
        url: "https://example.com/cover.jpg",
        width: 400,
        height: 600,
        format: "jpeg",
        quality: "large",
        verified: true,
      };

      const result = reconciler.normalizeCoverImage(image);
      expect(result).toEqual(
        expect.objectContaining({
          url: "https://example.com/cover.jpg",
          width: 400,
          height: 600,
          format: "jpeg",
          quality: "large",
          verified: true,
          aspectRatio: 1.5,
        }),
      );
    });
  });

  describe("reconcileDescriptions", () => {
    it("should select the highest quality description", () => {
      const inputs: ContentDescriptionInput[] = [
        {
          descriptions: ["Short desc"],
          source: lowReliabilitySource,
        },
        {
          descriptions: [
            "This is a comprehensive and well-written description that provides excellent insight into the book's content and themes.",
          ],
          source: highReliabilitySource,
        },
        {
          descriptions: ["Medium quality description with decent length"],
          source: mediumReliabilitySource,
        },
      ];

      const result = reconciler.reconcileDescriptions(inputs);

      expect(result.value.text).toContain("comprehensive and well-written");
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.sources).toHaveLength(3);
    });

    it("should handle empty descriptions", () => {
      const inputs: ContentDescriptionInput[] = [
        { descriptions: [], source: highReliabilitySource },
      ];

      const result = reconciler.reconcileDescriptions(inputs);

      expect(result.value.text).toBe("");
      expect(result.confidence).toBe(0.1);
      expect(result.reasoning).toContain("No valid descriptions found");
    });

    it("should detect conflicts between different descriptions", () => {
      const inputs: ContentDescriptionInput[] = [
        {
          descriptions: [
            "This book is about space exploration and the future of humanity.",
          ],
          source: highReliabilitySource,
        },
        {
          descriptions: ["A romantic comedy set in modern-day New York City."],
          source: mediumReliabilitySource,
        },
      ];

      const result = reconciler.reconcileDescriptions(inputs);

      expect(result.conflicts).toBeDefined();
      expect(result.conflicts![0].field).toBe("description");
      expect(result.reasoning).toContain("conflict resolution");
    });
  });

  describe("reconcileTableOfContents", () => {
    it("should select the most complete table of contents", () => {
      const inputs: ContentDescriptionInput[] = [
        {
          tableOfContents: "Chapter 1\nChapter 2",
          source: lowReliabilitySource,
        },
        {
          tableOfContents: {
            entries: [
              { title: "Introduction", page: 1, level: 0 },
              { title: "Chapter 1: Beginning", page: 5, level: 0 },
              { title: "Chapter 2: Middle", page: 20, level: 0 },
              { title: "Chapter 3: End", page: 35, level: 0 },
              { title: "Conclusion", page: 50, level: 0 },
            ],
            format: "detailed",
            pageNumbers: true,
          },
          source: highReliabilitySource,
        },
      ];

      const result = reconciler.reconcileTableOfContents(inputs);

      expect(result.value.entries).toHaveLength(5);
      expect(result.value.format).toBe("detailed");
      expect(result.value.pageNumbers).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it("should handle missing table of contents", () => {
      const inputs: ContentDescriptionInput[] = [
        { source: highReliabilitySource },
      ];

      const result = reconciler.reconcileTableOfContents(inputs);

      expect(result.value.entries).toHaveLength(0);
      expect(result.confidence).toBe(0.1);
      expect(result.reasoning).toContain("No table of contents found");
    });
  });

  describe("reconcileReviews", () => {
    it("should sort reviews by quality indicators", () => {
      const reviews: Review[] = [
        {
          text: "Short review",
          rating: 4,
          scale: 5,
          verified: false,
        },
        {
          text: "This is a very detailed and helpful review that provides great insights into the book's strengths and weaknesses.",
          rating: 5,
          scale: 5,
          verified: true,
          helpful: 25,
          total: 30,
        },
        {
          text: "Medium length review with some good points",
          rating: 3,
          scale: 5,
          verified: false,
          helpful: 5,
          total: 10,
        },
      ];

      const inputs: ContentDescriptionInput[] = [
        { reviews, source: highReliabilitySource },
      ];

      const result = reconciler.reconcileReviews(inputs);

      expect(result.value).toHaveLength(3);
      expect(result.value[0].verified).toBe(true);
      expect(result.value[0].text).toContain("detailed and helpful");
    });

    it("should limit the number of reviews", () => {
      const manyReviews: Review[] = Array.from({ length: 15 }, (_, i) => ({
        text: `Review ${i + 1}`,
        rating: 4,
        scale: 5,
      }));

      const inputs: ContentDescriptionInput[] = [
        { reviews: manyReviews, source: highReliabilitySource },
      ];

      const result = reconciler.reconcileReviews(inputs);

      expect(result.value).toHaveLength(10);
      expect(result.reasoning).toContain("Selected top 10 reviews");
    });
  });

  describe("reconcileRating", () => {
    it("should calculate weighted average rating", () => {
      const inputs: ContentDescriptionInput[] = [
        {
          ratings: [{ value: 4.5, scale: 5, count: 100 }],
          source: highReliabilitySource,
        },
        {
          ratings: [{ value: 3.0, scale: 5, count: 10 }],
          source: lowReliabilitySource,
        },
        {
          ratings: [{ value: 8.0, scale: 10, count: 50 }],
          source: mediumReliabilitySource,
        },
      ];

      const result = reconciler.reconcileRating(inputs);

      expect(result.value.value).toBeGreaterThan(3.5);
      expect(result.value.value).toBeLessThan(5.0);
      expect(result.value.scale).toBe(5); // Most common scale
      expect(result.value.count).toBe(160); // Total count
      expect(result.confidence).toBeGreaterThanOrEqual(0.6);
    });

    it("should detect rating conflicts", () => {
      const inputs: ContentDescriptionInput[] = [
        {
          ratings: [{ value: 5.0, scale: 5, count: 100 }],
          source: highReliabilitySource,
        },
        {
          ratings: [{ value: 2.0, scale: 5, count: 100 }],
          source: mediumReliabilitySource,
        },
      ];

      const result = reconciler.reconcileRating(inputs);

      expect(result.conflicts).toBeDefined();
      expect(result.conflicts![0].field).toBe("rating");
      expect(result.reasoning).toContain("conflict resolution");
    });

    it("should handle missing ratings", () => {
      const inputs: ContentDescriptionInput[] = [
        { source: highReliabilitySource },
      ];

      const result = reconciler.reconcileRating(inputs);

      expect(result.value.value).toBe(0);
      expect(result.value.scale).toBe(5);
      expect(result.confidence).toBe(0.1);
      expect(result.reasoning).toContain("No ratings found");
    });
  });

  describe("reconcileCoverImage", () => {
    it("should select the highest quality image", () => {
      const inputs: ContentDescriptionInput[] = [
        {
          coverImages: ["https://example.com/small.jpg"],
          source: lowReliabilitySource,
        },
        {
          coverImages: [
            {
              url: "https://example.com/large.jpg",
              width: 800,
              height: 1200,
              format: "jpeg",
              quality: "large",
              verified: true,
            },
          ],
          source: highReliabilitySource,
        },
        {
          coverImages: [
            {
              url: "https://example.com/medium.png",
              width: 400,
              height: 600,
              format: "png",
              quality: "medium",
            },
          ],
          source: mediumReliabilitySource,
        },
      ];

      const result = reconciler.reconcileCoverImage(inputs);

      expect(result.value.url).toBe("https://example.com/large.jpg");
      expect(result.value.width).toBe(800);
      expect(result.value.height).toBe(1200);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it("should detect image conflicts", () => {
      const inputs: ContentDescriptionInput[] = [
        {
          coverImages: ["https://example.com/image1.jpg"],
          source: highReliabilitySource,
        },
        {
          coverImages: ["https://example.com/image2.jpg"],
          source: mediumReliabilitySource,
        },
      ];

      const result = reconciler.reconcileCoverImage(inputs);

      expect(result.conflicts).toBeDefined();
      expect(result.conflicts![0].field).toBe("coverImage");
      expect(result.reasoning).toContain("conflict resolution");
    });

    it("should handle missing cover images", () => {
      const inputs: ContentDescriptionInput[] = [
        { source: highReliabilitySource },
      ];

      const result = reconciler.reconcileCoverImage(inputs);

      expect(result.value.url).toBe("");
      expect(result.confidence).toBe(0.1);
      expect(result.reasoning).toContain("No cover images found");
    });
  });

  describe("reconcileExcerpt", () => {
    it("should select the best excerpt based on source reliability", () => {
      const inputs: ContentDescriptionInput[] = [
        {
          excerpt: "Short excerpt from unreliable source",
          source: lowReliabilitySource,
        },
        {
          excerpt:
            "This is a high-quality excerpt from a reliable source that provides a good sample of the book's writing style and content.",
          source: highReliabilitySource,
        },
      ];

      const result = reconciler.reconcileExcerpt(inputs);

      expect(result.value).toContain("high-quality excerpt");
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it("should handle missing excerpts", () => {
      const inputs: ContentDescriptionInput[] = [
        { source: highReliabilitySource },
      ];

      const result = reconciler.reconcileExcerpt(inputs);

      expect(result.value).toBe("");
      expect(result.confidence).toBe(0.1);
      expect(result.reasoning).toContain("No excerpts found");
    });
  });

  describe("reconcileContentDescription", () => {
    it("should reconcile all content description fields", () => {
      const inputs: ContentDescriptionInput[] = [
        {
          descriptions: ["A comprehensive book about science and discovery."],
          tableOfContents:
            "Chapter 1: Introduction\nChapter 2: Methods\nChapter 3: Results",
          reviews: [
            {
              text: "Excellent book with great insights",
              rating: 5,
              scale: 5,
              verified: true,
            },
          ],
          ratings: [{ value: 4.5, scale: 5, count: 200 }],
          coverImages: [
            {
              url: "https://example.com/cover.jpg",
              width: 600,
              height: 900,
              format: "jpeg",
              quality: "large",
            },
          ],
          excerpt: "In the beginning, there was curiosity...",
          source: highReliabilitySource,
        },
      ];

      const result = reconciler.reconcileContentDescription(inputs);

      expect(result.description.value.text).toContain("comprehensive book");
      expect(result.tableOfContents.value.entries).toHaveLength(3);
      expect(result.reviews.value).toHaveLength(1);
      expect(result.rating.value.value).toBe(4.5);
      expect(result.coverImage.value.url).toBe("https://example.com/cover.jpg");
      expect(result.excerpt.value).toContain("curiosity");
    });

    it("should throw error for empty inputs", () => {
      expect(() => {
        reconciler.reconcileContentDescription([]);
      }).toThrow("No content descriptions to reconcile");
    });
  });
});
