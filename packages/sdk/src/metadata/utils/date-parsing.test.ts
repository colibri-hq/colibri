/**
 * Tests for date parsing utilities
 */

import { describe, expect, it } from "vitest";
import {
  extractYear,
  formatDate,
  parseDate,
  type ParsedDate,
  parsePublicationDate,
  toDate,
} from "./date-parsing.js";

describe("parsePublicationDate", () => {
  describe("ISO 8601 formats", () => {
    it("should parse full date (YYYY-MM-DD)", () => {
      const result = parsePublicationDate("2020-06-15");
      expect(result).not.toBeNull();
      expect(result!.year).toBe(2020);
      expect(result!.month).toBe(6);
      expect(result!.day).toBe(15);
    });

    it("should parse ISO 8601 with time", () => {
      const result = parsePublicationDate("2020-06-15T12:00:00Z");
      expect(result).not.toBeNull();
      expect(result!.year).toBe(2020);
      expect(result!.month).toBe(6);
      expect(result!.day).toBe(15);
    });

    it("should parse ISO 8601 with timezone offset", () => {
      const result = parsePublicationDate("2020-06-15T12:00:00+02:00");
      expect(result).not.toBeNull();
      expect(result!.year).toBe(2020);
    });
  });

  describe("partial dates", () => {
    it("should parse year-month (YYYY-MM)", () => {
      const result = parsePublicationDate("2020-06");
      expect(result).not.toBeNull();
      expect(result!.year).toBe(2020);
      expect(result!.month).toBe(6);
      expect(result!.day).toBeUndefined();
    });

    it("should parse year-only (YYYY)", () => {
      const result = parsePublicationDate("2020");
      expect(result).not.toBeNull();
      expect(result!.year).toBe(2020);
      expect(result!.month).toBeUndefined();
      expect(result!.day).toBeUndefined();
    });
  });

  describe("slash-separated dates", () => {
    it("should parse YYYY/MM/DD", () => {
      const result = parsePublicationDate("2020/06/15");
      expect(result).not.toBeNull();
      expect(result!.year).toBe(2020);
      expect(result!.month).toBe(6);
      expect(result!.day).toBe(15);
    });

    it("should parse YYYY/MM", () => {
      const result = parsePublicationDate("2020/06");
      expect(result).not.toBeNull();
      expect(result!.year).toBe(2020);
      expect(result!.month).toBe(6);
    });
  });

  describe("written formats", () => {
    it("should parse 'Month YYYY'", () => {
      const result = parsePublicationDate("June 2020");
      expect(result).not.toBeNull();
      expect(result!.year).toBe(2020);
      expect(result!.month).toBe(6);
    });

    it("should parse abbreviated month 'Mon YYYY'", () => {
      const result = parsePublicationDate("Jun 2020");
      expect(result).not.toBeNull();
      expect(result!.year).toBe(2020);
      expect(result!.month).toBe(6);
    });

    it("should parse 'Month DD, YYYY'", () => {
      const result = parsePublicationDate("June 15, 2020");
      expect(result).not.toBeNull();
      expect(result!.year).toBe(2020);
      expect(result!.month).toBe(6);
      expect(result!.day).toBe(15);
    });

    it("should parse 'Month DD YYYY' (no comma)", () => {
      const result = parsePublicationDate("June 15 2020");
      expect(result).not.toBeNull();
      expect(result!.year).toBe(2020);
      expect(result!.month).toBe(6);
      expect(result!.day).toBe(15);
    });

    it("should parse 'DD Month YYYY'", () => {
      const result = parsePublicationDate("15 June 2020");
      expect(result).not.toBeNull();
      expect(result!.year).toBe(2020);
      expect(result!.month).toBe(6);
      expect(result!.day).toBe(15);
    });
  });

  describe("circa dates", () => {
    it("should parse 'c. YYYY'", () => {
      const result = parsePublicationDate("c. 1920");
      expect(result).not.toBeNull();
      expect(result!.year).toBe(1920);
      expect(result!.isApproximate).toBe(true);
    });

    it("should parse 'ca. YYYY'", () => {
      const result = parsePublicationDate("ca. 1920");
      expect(result).not.toBeNull();
      expect(result!.year).toBe(1920);
      expect(result!.isApproximate).toBe(true);
    });

    it("should parse 'circa YYYY'", () => {
      const result = parsePublicationDate("circa 1920");
      expect(result).not.toBeNull();
      expect(result!.year).toBe(1920);
      expect(result!.isApproximate).toBe(true);
    });

    it("should parse 'approximately YYYY'", () => {
      const result = parsePublicationDate("approximately 1920");
      expect(result).not.toBeNull();
      expect(result!.year).toBe(1920);
      expect(result!.isApproximate).toBe(true);
    });
  });

  describe("year ranges", () => {
    it("should extract first year from range 'YYYY-YYYY'", () => {
      const result = parsePublicationDate("1920-1925");
      expect(result).not.toBeNull();
      expect(result!.year).toBe(1920);
    });
  });

  describe("edge cases", () => {
    it("should return null for empty input", () => {
      expect(parsePublicationDate("")).toBeNull();
      expect(parsePublicationDate("   ")).toBeNull();
    });

    it("should return null for non-date strings", () => {
      expect(parsePublicationDate("not a date")).toBeNull();
      expect(parsePublicationDate("hello")).toBeNull();
    });

    it("should return null for invalid dates", () => {
      expect(parsePublicationDate("2020-13-01")).toBeNull(); // Invalid month
      expect(parsePublicationDate("2020-02-30")).toBeNull(); // Invalid day
    });

    it("should reject years before 1000", () => {
      expect(parsePublicationDate("0500")).toBeNull();
    });

    it("should reject years far in future", () => {
      expect(parsePublicationDate("3000")).toBeNull();
    });

    it("should preserve original string", () => {
      const result = parsePublicationDate("June 2020");
      expect(result!.original).toBe("June 2020");
    });
  });

  describe("all months", () => {
    const months = [
      ["January", 1],
      ["February", 2],
      ["March", 3],
      ["April", 4],
      ["May", 5],
      ["June", 6],
      ["July", 7],
      ["August", 8],
      ["September", 9],
      ["October", 10],
      ["November", 11],
      ["December", 12],
    ] as const;

    for (const [name, num] of months) {
      it(`should parse ${name}`, () => {
        const result = parsePublicationDate(`${name} 2020`);
        expect(result).not.toBeNull();
        expect(result!.month).toBe(num);
      });
    }

    const abbreviatedMonths = [
      ["Jan", 1],
      ["Feb", 2],
      ["Mar", 3],
      ["Apr", 4],
      ["May", 5],
      ["Jun", 6],
      ["Jul", 7],
      ["Aug", 8],
      ["Sep", 9],
      ["Sept", 9],
      ["Oct", 10],
      ["Nov", 11],
      ["Dec", 12],
    ] as const;

    for (const [name, num] of abbreviatedMonths) {
      it(`should parse ${name}`, () => {
        const result = parsePublicationDate(`${name} 2020`);
        expect(result).not.toBeNull();
        expect(result!.month).toBe(num);
      });
    }
  });
});

describe("extractYear", () => {
  it("should extract year from full date", () => {
    expect(extractYear("2020-06-15")).toBe(2020);
  });

  it("should extract year from year-only", () => {
    expect(extractYear("2020")).toBe(2020);
  });

  it("should extract year from text", () => {
    expect(extractYear("Published in 2020")).toBe(2020);
    expect(extractYear("Copyright 1999")).toBe(1999);
  });

  it("should extract first year from range", () => {
    expect(extractYear("1920-1925")).toBe(1920);
  });

  it("should return null for non-year text", () => {
    expect(extractYear("no year here")).toBeNull();
    expect(extractYear("")).toBeNull();
  });

  it("should reject invalid years", () => {
    expect(extractYear("0500")).toBeNull();
  });
});

describe("toDate", () => {
  it("should convert full date", () => {
    const parsed: ParsedDate = { year: 2020, month: 6, day: 15, original: "2020-06-15" };
    const date = toDate(parsed);
    expect(date.getFullYear()).toBe(2020);
    expect(date.getMonth()).toBe(5); // JS months are 0-indexed
    expect(date.getDate()).toBe(15);
  });

  it("should use defaults for partial dates", () => {
    const parsed: ParsedDate = { year: 2020, original: "2020" };
    const date = toDate(parsed);
    expect(date.getFullYear()).toBe(2020);
    expect(date.getMonth()).toBe(0); // January
    expect(date.getDate()).toBe(1);
  });
});

describe("formatDate", () => {
  it("should format full date as ISO", () => {
    const parsed: ParsedDate = { year: 2020, month: 6, day: 15, original: "" };
    expect(formatDate(parsed, "iso")).toBe("2020-06-15");
  });

  it("should format year-month as ISO", () => {
    const parsed: ParsedDate = { year: 2020, month: 6, original: "" };
    expect(formatDate(parsed, "iso")).toBe("2020-06");
  });

  it("should format year-only", () => {
    const parsed: ParsedDate = { year: 2020, original: "" };
    expect(formatDate(parsed, "year-only")).toBe("2020");
    expect(formatDate(parsed, "iso")).toBe("2020");
  });

  it("should include circa prefix for approximate dates", () => {
    const parsed: ParsedDate = { year: 1920, original: "", isApproximate: true };
    expect(formatDate(parsed, "year-only")).toBe("c. 1920");
    expect(formatDate(parsed, "iso")).toBe("c. 1920");
  });

  it("should pad month and day", () => {
    const parsed: ParsedDate = { year: 2020, month: 1, day: 5, original: "" };
    expect(formatDate(parsed, "iso")).toBe("2020-01-05");
  });
});

describe("parseDate (convenience function)", () => {
  it("should return Date object for valid input", () => {
    const date = parseDate("2020-06-15");
    expect(date).toBeInstanceOf(Date);
    expect(date!.getFullYear()).toBe(2020);
  });

  it("should return undefined for invalid input", () => {
    expect(parseDate("invalid")).toBeUndefined();
    expect(parseDate("")).toBeUndefined();
    expect(parseDate(undefined)).toBeUndefined();
  });

  it("should handle native Date parsing as fallback", () => {
    // ISO format that our parser handles
    const date = parseDate("2020-06-15T12:00:00Z");
    expect(date).toBeInstanceOf(Date);
  });
});

describe("Integration: Common metadata date formats", () => {
  const commonFormats = [
    ["2020", 2020, undefined, undefined],
    ["2020-06", 2020, 6, undefined],
    ["2020-06-15", 2020, 6, 15],
    ["June 2020", 2020, 6, undefined],
    ["Jun 15, 2020", 2020, 6, 15],
    ["15 June 2020", 2020, 6, 15],
    ["c. 1920", 1920, undefined, undefined],
  ] as const;

  for (const [input, year, month, day] of commonFormats) {
    it(`should parse "${input}"`, () => {
      const result = parsePublicationDate(input);
      expect(result).not.toBeNull();
      expect(result!.year).toBe(year);
      expect(result!.month).toBe(month);
      expect(result!.day).toBe(day);
    });
  }
});
