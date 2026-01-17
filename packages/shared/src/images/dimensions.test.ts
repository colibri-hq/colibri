import { beforeEach, describe, expect, it, vi } from "vitest";
import { getImageDimensions } from "./dimensions.js";

// Mock ImageBitmap
const mockImageBitmap = { width: 100, height: 100 };

// Mock global browser APIs
global.createImageBitmap = vi.fn().mockResolvedValue(mockImageBitmap);

// Track error callback for testing error scenarios
let _errorCallback: ((error: Error) => void) | null = null;
let _loadCallback: (() => void) | null = null;

global.Image = vi.fn().mockImplementation(function (this: any) {
  this.src = "";
  this.width = 100;
  this.height = 100;
  this.addEventListener = vi.fn().mockImplementation((event: string, callback: () => void) => {
    if (event === "load") {
      _loadCallback = callback;
      // By default, trigger load
      setTimeout(() => callback(), 0);
    } else if (event === "error") {
      _errorCallback = callback as unknown as (error: Error) => void;
    }
  });
}) as unknown as typeof Image;

describe("Images", () => {
  describe("Dimensions", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      errorCallback = null;
      loadCallback = null;
    });

    describe("getImageDimensions", () => {
      it("should get dimensions from URL string", async () => {
        const result = await getImageDimensions("https://example.com/image.jpg");

        expect(result).toEqual({ width: 100, height: 100 });
      });

      it("should get dimensions from ArrayBuffer", async () => {
        const input = new ArrayBuffer(100);
        const result = await getImageDimensions(input);

        expect(createImageBitmap).toHaveBeenCalledWith(expect.any(Blob), {});
        expect(result).toEqual({ width: 100, height: 100 });
      });

      it("should handle image load errors", async () => {
        // Override Image mock to trigger error
        global.Image = vi.fn().mockImplementation(function (this: any) {
          this.src = "";
          this.width = 100;
          this.height = 100;
          this.addEventListener = vi
            .fn()
            .mockImplementation((event: string, callback: (error?: Error) => void) => {
              if (event === "error") {
                setTimeout(() => callback(new Error("Failed to load image")), 0);
              }
            });
        }) as unknown as typeof Image;

        await expect(getImageDimensions("invalid-url.jpg")).rejects.toThrow();
      });
    });
  });
});
