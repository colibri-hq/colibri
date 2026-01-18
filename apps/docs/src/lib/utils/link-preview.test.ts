import { describe, expect, it } from "vitest";
import { isInternalDocLink } from "./link-preview";

describe("isInternalDocLink", () => {
  describe("relative paths", () => {
    it("returns true for simple relative paths", () => {
      expect(isInternalDocLink("/getting-started")).toBe(true);
      expect(isInternalDocLink("/packages/sdk")).toBe(true);
      expect(isInternalDocLink("getting-started")).toBe(true);
    });

    it("returns true for nested relative paths", () => {
      expect(isInternalDocLink("/getting-started/quick-start")).toBe(true);
      expect(isInternalDocLink("packages/sdk/database")).toBe(true);
    });
  });

  describe("anchor links", () => {
    it("returns false for anchor-only links", () => {
      expect(isInternalDocLink("#section")).toBe(false);
      expect(isInternalDocLink("#")).toBe(false);
    });
  });

  describe("protocol links", () => {
    it("returns false for mailto links", () => {
      expect(isInternalDocLink("mailto:test@example.com")).toBe(false);
    });

    it("returns false for tel links", () => {
      expect(isInternalDocLink("tel:+1234567890")).toBe(false);
    });

    it("returns false for javascript links", () => {
      expect(isInternalDocLink("javascript:void(0)")).toBe(false);
    });
  });

  describe("absolute URLs", () => {
    it("returns true for localhost URLs", () => {
      expect(isInternalDocLink("http://localhost:5173/getting-started")).toBe(true);
      expect(isInternalDocLink("https://localhost/packages")).toBe(true);
    });

    it("returns true for colibri domain URLs", () => {
      expect(isInternalDocLink("https://docs.colibri.example.com/getting-started")).toBe(true);
      expect(isInternalDocLink("https://colibri.dev/packages")).toBe(true);
    });

    it("returns false for external URLs", () => {
      expect(isInternalDocLink("https://github.com/colibri-hq/colibri")).toBe(false);
      expect(isInternalDocLink("https://example.com")).toBe(false);
      expect(isInternalDocLink("http://google.com")).toBe(false);
    });

    it("returns false for invalid URLs", () => {
      expect(isInternalDocLink("https://")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("returns false for empty string", () => {
      expect(isInternalDocLink("")).toBe(false);
    });

    it("handles URLs with query strings", () => {
      expect(isInternalDocLink("/getting-started?tab=1")).toBe(true);
      expect(isInternalDocLink("https://localhost/page?query=test")).toBe(true);
    });

    it("handles URLs with fragments", () => {
      expect(isInternalDocLink("/getting-started#section")).toBe(true);
    });
  });
});
