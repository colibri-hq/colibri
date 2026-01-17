import { describe, it, expect } from "vitest";
import { normalizeSlug } from "./content";

describe("normalizeSlug", () => {
  it("adds leading slash if missing", () => {
    expect(normalizeSlug("getting-started")).toBe("/getting-started");
  });

  it("removes trailing slash", () => {
    expect(normalizeSlug("/getting-started/")).toBe("/getting-started");
  });

  it("handles both missing leading and trailing slash", () => {
    expect(normalizeSlug("getting-started/")).toBe("/getting-started");
  });

  it("leaves already normalized slug unchanged", () => {
    expect(normalizeSlug("/getting-started")).toBe("/getting-started");
  });

  it("handles nested paths", () => {
    expect(normalizeSlug("getting-started/quick-start")).toBe("/getting-started/quick-start");
  });

  it("handles deeply nested paths", () => {
    expect(normalizeSlug("packages/sdk/database/")).toBe("/packages/sdk/database");
  });

  it("handles root slash", () => {
    // "/" after removing trailing slash becomes "" which then gets "/" prepended
    expect(normalizeSlug("/")).toBe("/");
  });

  it("handles empty string", () => {
    // "" gets "/" prepended
    expect(normalizeSlug("")).toBe("/");
  });
});
