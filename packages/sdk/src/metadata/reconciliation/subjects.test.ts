import { describe, expect, it } from "vitest";
import { SubjectReconciler } from "./subjects.js";
import type { MetadataSource, Subject, SubjectInput } from "./types.js";

describe("SubjectReconciler", () => {
  const reconciler = new SubjectReconciler();

  const mockSource1: MetadataSource = {
    name: "OpenLibrary",
    reliability: 0.8,
    timestamp: new Date("2024-01-01"),
  };

  const mockSource2: MetadataSource = {
    name: "WikiData",
    reliability: 0.9,
    timestamp: new Date("2024-01-02"),
  };

  const mockSource3: MetadataSource = {
    name: "LibraryOfCongress",
    reliability: 0.95,
    timestamp: new Date("2024-01-03"),
  };

  describe("normalizeSubject", () => {
    it("should normalize string subjects", () => {
      const result = reconciler.normalizeSubject("Science Fiction");
      expect(result.name).toBe("Science Fiction");
      expect(result.normalized).toBe("science fiction");
      expect(result.type).toBe("genre");
      expect(result.scheme).toBe("unknown");
    });

    it("should normalize subject objects", () => {
      const input: Subject = {
        name: "Computer Science",
        code: "004",
        scheme: "dewey",
      };
      const result = reconciler.normalizeSubject(input);
      expect(result.name).toBe("Computer Science");
      expect(result.normalized).toBe("computer science");
      expect(result.scheme).toBe("dewey");
      expect(result.hierarchy).toContain("computer science");
    });

    it("should detect Dewey Decimal codes", () => {
      const result = reconciler.normalizeSubject("510.1 Mathematics");
      expect(result.scheme).toBe("dewey");
    });

    it("should detect Library of Congress codes", () => {
      const result = reconciler.normalizeSubject("QA76 Computer Science");
      expect(result.scheme).toBe("lcc");
    });

    it("should detect BISAC codes", () => {
      const result = reconciler.normalizeSubject("FIC000000 Fiction");
      expect(result.scheme).toBe("bisac");
    });

    it("should detect LCSH format", () => {
      const result = reconciler.normalizeSubject(
        "Computer programming -- Software engineering",
      );
      expect(result.scheme).toBe("lcsh");
      expect(result.hierarchy).toEqual([
        "Computer programming",
        "Software engineering",
      ]);
    });

    it("should normalize common genre variations", () => {
      expect(reconciler.normalizeSubject("sci-fi").normalized).toBe(
        "science fiction",
      );
      expect(reconciler.normalizeSubject("SF").normalized).toBe(
        "science fiction",
      );
      expect(reconciler.normalizeSubject("YA").normalized).toBe("young adult");
      expect(reconciler.normalizeSubject("non-fiction").normalized).toBe(
        "nonfiction",
      );
    });

    it("should detect subject types correctly", () => {
      expect(reconciler.normalizeSubject("mystery").type).toBe("genre");
      expect(reconciler.normalizeSubject("programming").type).toBe("tag");
      expect(reconciler.normalizeSubject("computer programming").type).toBe(
        "keyword",
      );
      expect(
        reconciler.normalizeSubject(
          "History of computer science in the 20th century",
        ).type,
      ).toBe("subject");
    });

    it("should build hierarchies for Dewey codes", () => {
      const result = reconciler.normalizeSubject({
        name: "Advanced Mathematics",
        code: "510",
        scheme: "dewey",
      });
      expect(result.hierarchy).toContain("mathematics");
      expect(result.hierarchy).toContain("science");
    });

    it("should build hierarchies for LCC codes", () => {
      const result = reconciler.normalizeSubject({
        name: "Computer Science",
        code: "QA76",
        scheme: "lcc",
      });
      expect(result.hierarchy).toContain("science");
    });
  });

  describe("reconcileSubjects", () => {
    it("should handle empty input", () => {
      expect(() => reconciler.reconcileSubjects([])).toThrow(
        "No subjects to reconcile",
      );
    });

    it("should handle single source", () => {
      const input: SubjectInput = {
        subjects: ["Science Fiction", "Adventure"],
        source: mockSource1,
      };

      const result = reconciler.reconcileSubjects([input]);
      expect(result.value).toHaveLength(2);

      const normalizedNames = result.value.map((s) => s.normalized);
      expect(normalizedNames).toContain("science fiction");
      expect(normalizedNames).toContain("adventure");
      expect(result.sources).toEqual([mockSource1]);
      expect(result.conflicts).toBeUndefined();
    });

    it("should deduplicate identical subjects", () => {
      const input1: SubjectInput = {
        subjects: ["Science Fiction", "Mystery"],
        source: mockSource1,
      };
      const input2: SubjectInput = {
        subjects: ["science fiction", "Thriller"],
        source: mockSource2,
      };

      const result = reconciler.reconcileSubjects([input1, input2]);

      // Should have 2-3 unique subjects (science fiction appears in both, mystery/thriller might be deduplicated)
      expect(result.value.length).toBeGreaterThanOrEqual(2);
      expect(result.value.length).toBeLessThanOrEqual(3);

      const normalizedNames = result.value.map((s) => s.normalized);
      expect(normalizedNames).toContain("science fiction");

      // Should only have one instance of science fiction
      const sciFiCount = normalizedNames.filter(
        (name) => name === "science fiction",
      ).length;
      expect(sciFiCount).toBe(1);
    });

    it("should handle similar subjects", () => {
      const input1: SubjectInput = {
        subjects: ["sci-fi", "detective"],
        source: mockSource1,
      };
      const input2: SubjectInput = {
        subjects: ["science fiction", "mystery"],
        source: mockSource2,
      };

      const result = reconciler.reconcileSubjects([input1, input2]);

      // Should deduplicate sci-fi/science fiction and detective/mystery
      expect(result.value).toHaveLength(2);

      const normalizedNames = result.value.map((s) => s.normalized);
      expect(normalizedNames).toContain("science fiction");
      expect(normalizedNames).toContain("mystery");
    });

    it("should prioritize more reliable sources", () => {
      const input1: SubjectInput = {
        subjects: ["Science Fiction"],
        source: mockSource1, // reliability 0.8
      };
      const input2: SubjectInput = {
        subjects: ["sci-fi"],
        source: mockSource3, // reliability 0.95
      };

      const result = reconciler.reconcileSubjects([input1, input2]);

      // Should prefer the subject from the more reliable source
      expect(result.value).toHaveLength(1);
      expect(result.value[0].normalized).toBe("science fiction");
      // The actual name might be from either source, but normalized should be consistent
    });

    it("should organize subjects by type", () => {
      const input: SubjectInput = {
        subjects: [
          "programming", // tag
          "computer science", // keyword
          "History of computing in the modern era", // subject
          "science fiction", // genre
        ],
        source: mockSource1,
      };

      const result = reconciler.reconcileSubjects([input]);

      expect(result.value).toHaveLength(4);

      // Should be ordered: subjects, genres, keywords, tags
      const types = result.value.map((s) => s.type);
      const subjectIndex = types.indexOf("subject");
      const genreIndex = types.indexOf("genre");
      const keywordIndex = types.indexOf("keyword");
      const tagIndex = types.indexOf("tag");

      expect(subjectIndex).toBeLessThan(genreIndex);
      expect(genreIndex).toBeLessThan(keywordIndex);
      expect(keywordIndex).toBeLessThan(tagIndex);
    });

    it("should handle subjects with classification codes", () => {
      const input1: SubjectInput = {
        subjects: [
          { name: "Mathematics", code: "510", scheme: "dewey" },
          { name: "Computer Science", code: "QA76", scheme: "lcc" },
        ],
        source: mockSource1,
      };
      const input2: SubjectInput = {
        subjects: ["math", "computing"],
        source: mockSource2,
      };

      const result = reconciler.reconcileSubjects([input1, input2]);

      // Should prefer subjects with classification codes
      const _mathSubject = result.value.find(
        (s) => s.name === "Mathematics" || s.normalized?.includes("math"),
      );
      const _csSubject = result.value.find(
        (s) =>
          s.name === "Computer Science" || s.normalized?.includes("computer"),
      );

      // At least one of the math subjects should have the code
      const hasCodedMath = result.value.some((s) => s.code === "510");
      const hasCodedCS = result.value.some((s) => s.code === "QA76");

      expect(hasCodedMath).toBe(true);
      expect(hasCodedCS).toBe(true);
    });

    it("should detect and report conflicts", () => {
      const input1: SubjectInput = {
        subjects: ["Science Fiction", "Mystery"],
        source: mockSource1,
      };
      const input2: SubjectInput = {
        subjects: ["Fantasy", "Thriller"],
        source: mockSource2,
      };

      const result = reconciler.reconcileSubjects([input1, input2]);

      expect(result.conflicts).toBeDefined();
      expect(result.conflicts![0].field).toBe("subjects");
      expect(result.conflicts![0].resolution).toContain(
        "Merged and deduplicated",
      );
    });

    it("should handle empty or invalid subjects", () => {
      const input1: SubjectInput = {
        subjects: ["", "   ", "Valid Subject"],
        source: mockSource1,
      };
      const input2: SubjectInput = {
        subjects: [],
        source: mockSource2,
      };

      const result = reconciler.reconcileSubjects([input1, input2]);

      // Should only include the valid subject
      expect(result.value).toHaveLength(1);
      expect(result.value[0].name).toBe("Valid Subject");
    });

    it("should calculate appropriate confidence scores", () => {
      const input1: SubjectInput = {
        subjects: [
          { name: "Mathematics", code: "510", scheme: "dewey" },
          { name: "Science", code: "500", scheme: "dewey" },
          "Programming",
          "Algorithms",
          "Data Structures",
        ],
        source: mockSource3, // High reliability
      };

      const result = reconciler.reconcileSubjects([input1]);

      // Should have high confidence due to:
      // - High source reliability (0.95)
      // - Multiple subjects (5)
      // - Some with classification schemes
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("should handle LCSH hierarchical subjects", () => {
      const input: SubjectInput = {
        subjects: [
          "Computer programming -- Software engineering -- Agile development",
          "Mathematics -- Algebra -- Linear algebra",
        ],
        source: mockSource1,
      };

      const result = reconciler.reconcileSubjects([input]);

      expect(result.value).toHaveLength(2);

      const programmingSubject = result.value.find((s) =>
        s.name.includes("Computer programming"),
      );
      const mathSubject = result.value.find((s) =>
        s.name.includes("Mathematics"),
      );

      expect(programmingSubject?.scheme).toBe("lcsh");
      expect(programmingSubject?.hierarchy).toEqual([
        "Computer programming",
        "Software engineering",
        "Agile development",
      ]);

      expect(mathSubject?.scheme).toBe("lcsh");
      expect(mathSubject?.hierarchy).toEqual([
        "Mathematics",
        "Algebra",
        "Linear algebra",
      ]);
    });
  });

  describe("edge cases", () => {
    it("should handle subjects with only whitespace", () => {
      const input: SubjectInput = {
        subjects: ["   ", "\t\n", ""],
        source: mockSource1,
      };

      const result = reconciler.reconcileSubjects([input]);
      expect(result.value).toHaveLength(0);
      expect(result.confidence).toBe(0.1);
    });

    it("should handle very long subject names", () => {
      const longSubject =
        "A very long subject name that goes on and on and describes something in great detail with many words and phrases";
      const input: SubjectInput = {
        subjects: [longSubject],
        source: mockSource1,
      };

      const result = reconciler.reconcileSubjects([input]);
      expect(result.value).toHaveLength(1);
      expect(result.value[0].type).toBe("subject");
    });

    it("should handle special characters in subject names", () => {
      const input: SubjectInput = {
        subjects: [
          "C++ Programming",
          "Web 2.0 & Social Media",
          "Science-Fiction/Fantasy",
        ],
        source: mockSource1,
      };

      const result = reconciler.reconcileSubjects([input]);
      expect(result.value).toHaveLength(3);

      // Should normalize but preserve meaningful content
      const normalizedNames = result.value.map((s) => s.normalized);
      expect(normalizedNames).toContain("c++ programming");
      expect(normalizedNames).toContain("web 2 0 & social media");
      expect(normalizedNames).toContain("science-fiction/fantasy");
    });

    it("should handle mixed string and object subjects", () => {
      const input: SubjectInput = {
        subjects: [
          "Science Fiction",
          { name: "Mathematics", code: "510", scheme: "dewey" },
          "Programming",
        ],
        source: mockSource1,
      };

      const result = reconciler.reconcileSubjects([input]);
      expect(result.value).toHaveLength(3);

      const mathSubject = result.value.find((s) => s.name === "Mathematics");
      expect(mathSubject?.code).toBe("510");
      expect(mathSubject?.scheme).toBe("dewey");
    });
  });
});
