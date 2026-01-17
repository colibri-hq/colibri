import { beforeEach, describe, expect, it, vi } from "vitest";
import { decodeBlurHashToImage, encodeImageToBlurHash } from "./blurhash.js";
import { getImageDimensions } from "./dimensions.js";

// Mock canvas and ImageBitmap - use large enough dimensions for blurhash decode (242x415)
const mockImageData = { data: new Uint8ClampedArray(242 * 415 * 4), width: 242, height: 415 };

const mockCanvas = {
  width: 242,
  height: 415,
  getContext: vi
    .fn()
    .mockReturnValue({
      drawImage: vi.fn(),
      getImageData: vi.fn().mockReturnValue(mockImageData),
      createImageData: vi.fn().mockReturnValue(mockImageData),
      putImageData: vi.fn(),
    }),
  toBlob: vi.fn().mockImplementation((callback) => {
    callback(new Blob(["mock-image-data"]));
  }),
};

const mockImageBitmap = { width: 100, height: 100 };

// Mock global objects
global.createImageBitmap = vi.fn().mockResolvedValue(mockImageBitmap);
global.Image = vi.fn().mockImplementation(function (this: any) {
  this.src = "";
  this.width = 100;
  this.height = 100;
  this.addEventListener = vi.fn().mockImplementation((event: string, callback: () => void) => {
    if (event === "load") {
      // Only trigger load callback, not error
      setTimeout(() => callback(), 0);
    }
    // Don't auto-trigger error callback - store it for tests that need it
  });
}) as unknown as typeof Image;

// Mock document for decodeBlurHashToImage
global.document = {
  createElement: vi.fn().mockImplementation((tagName: string) => {
    if (tagName === "canvas") {
      return mockCanvas;
    }
    return {};
  }),
} as unknown as Document;

describe("Images", () => {
  describe("Blurhash", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    describe("encodeImageToBlurHash", () => {
      it("should encode image to blurhash", async () => {
        const input = new Blob(["mock-image-data"]);
        const context = mockCanvas.getContext("2d");

        const result = await encodeImageToBlurHash(input, context);

        expect(createImageBitmap).toHaveBeenCalledWith(input, {});
        expect(context.drawImage).toHaveBeenCalledWith(mockImageBitmap, 0, 0);
        expect(context.getImageData).toHaveBeenCalledWith(0, 0, 100, 100);
        expect(result).toBeDefined();
        expect(typeof result).toBe("string");
      });

      it("should handle ArrayBuffer input", async () => {
        const input = new ArrayBuffer(100);
        const context = mockCanvas.getContext("2d");

        const result = await encodeImageToBlurHash(input, context);

        expect(createImageBitmap).toHaveBeenCalledWith(expect.any(Blob), {});
        expect(result).toBeDefined();
      });
    });

    describe("decodeBlurHashToImage", () => {
      it("should decode blurhash to image blob", async () => {
        const hash = "LEHV6nWB2yk8pyo0adR*.7kCMdnj";
        const result = await decodeBlurHashToImage(hash);

        expect(result).toBeInstanceOf(Blob);
      });
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
        // Override Image mock to trigger error instead of load
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
              // Don't trigger load callback
            });
        }) as unknown as typeof Image;

        await expect(getImageDimensions("invalid-url.jpg")).rejects.toThrow();
      });
    });
  });
});
