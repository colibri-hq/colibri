import { describe, expect, it } from "vitest";
import { buildSearchQuery } from "./search.js";

describe("Search", () => {
  describe("Query Builder", () => {
    it("should build a search query with a single term", () => {
      const result = buildSearchQuery<"title">({ title: "Gatsby" });

      expect(result).toEqual("title:Gatsby");
    });

    it("should build a search query with multiple terms", () => {
      const result = buildSearchQuery<"title" | "author">({
        title: "Gatsby",
        author: "Fitzgerald",
      });

      expect(result).toEqual("title:Gatsby AND author:Fitzgerald");
    });

    it("should handle whitespace in terms", () => {
      const result = buildSearchQuery<"title">({ title: "The Great Gatsby" });

      expect(result).toEqual('title:"The Great Gatsby"');
    });

    it("should handle negation in terms", () => {
      const result = buildSearchQuery<"title">({ "!title": "Gatsby" });

      expect(result).toEqual("NOT title:Gatsby");
    });

    it("should handle multiple values for a single key", () => {
      const result = buildSearchQuery<"title">({ title: ["Gatsby", "Mockingbird"] });

      expect(result).toEqual("title:(Gatsby Mockingbird)");
    });

    it("should handle alternative values", () => {
      const result = buildSearchQuery<"title">({ title: [["Gatsby", "Mockingbird"]] });

      expect(result).toEqual("title:(Gatsby OR Mockingbird)");
    });

    it("should handle range queries", () => {
      const result = buildSearchQuery<"year">({ year: { from: 1920, to: 1930 } });

      expect(result).toEqual("year:[1920 TO 1930]");
    });

    it("should handle range queries with FROM wildcard", () => {
      const result = buildSearchQuery<"year">({ year: { to: 1930 } });

      expect(result).toEqual("year:[* TO 1930]");
    });

    it("should handle range queries with TO wildcard", () => {
      const result = buildSearchQuery<"year">({ year: { from: 1920 } });

      expect(result).toEqual("year:[1920 TO *]");
    });
  });
});
