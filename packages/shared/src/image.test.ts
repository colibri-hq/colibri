import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  encodeImageToBlurHash,
  decodeBlurHashToImage,
  getImageDimensions,
} from './image';

// Mock canvas and ImageBitmap
const mockImageData = {
  data: new Uint8ClampedArray(100 * 100 * 4),
  width: 100,
  height: 100,
};

const mockCanvas = {
  width: 100,
  height: 100,
  getContext: vi.fn().mockReturnValue({
    drawImage: vi.fn(),
    getImageData: vi.fn().mockReturnValue(mockImageData),
    createImageData: vi.fn().mockReturnValue(mockImageData),
    putImageData: vi.fn(),
  }),
  toBlob: vi.fn().mockImplementation((callback) => {
    callback(new Blob(['mock-image-data']));
  }),
};

const mockImageBitmap = {
  width: 100,
  height: 100,
};

// Mock global objects
global.createImageBitmap = vi.fn().mockResolvedValue(mockImageBitmap);
global.Image = vi.fn().mockImplementation(() => ({
  src: '',
  width: 100,
  height: 100,
  addEventListener: vi.fn().mockImplementation((event, callback) => {
    if (event === 'load') {
      callback();
    } else if (event === 'error') {
      callback(new Error('Failed to load image'));
    }
  }),
}));

describe('image', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('encodeImageToBlurHash', () => {
    it('should encode image to blurhash', async () => {
      const input = new Blob(['mock-image-data']);
      const context = mockCanvas.getContext('2d');

      const result = await encodeImageToBlurHash(input, context);

      expect(createImageBitmap).toHaveBeenCalledWith(input, {});
      expect(context.drawImage).toHaveBeenCalledWith(mockImageBitmap, 0, 0);
      expect(context.getImageData).toHaveBeenCalledWith(0, 0, 100, 100);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle ArrayBuffer input', async () => {
      const input = new ArrayBuffer(100);
      const context = mockCanvas.getContext('2d');

      const result = await encodeImageToBlurHash(input, context);

      expect(createImageBitmap).toHaveBeenCalledWith(expect.any(Blob), {});
      expect(result).toBeDefined();
    });
  });

  describe('decodeBlurHashToImage', () => {
    it('should decode blurhash to image blob', async () => {
      const hash = 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';
      const result = await decodeBlurHashToImage(hash);

      expect(result).toBeInstanceOf(Blob);
    });
  });

  describe('getImageDimensions', () => {
    it('should get dimensions from URL string', async () => {
      const result = await getImageDimensions('https://example.com/image.jpg');

      expect(result).toEqual({
        width: 100,
        height: 100,
      });
    });

    it('should get dimensions from ArrayBuffer', async () => {
      const input = new ArrayBuffer(100);
      const result = await getImageDimensions(input);

      expect(createImageBitmap).toHaveBeenCalledWith(expect.any(Blob), {});
      expect(result).toEqual({
        width: 100,
        height: 100,
      });
    });

    it('should handle image load errors', async () => {
      const mockImage = new Image();
      mockImage.addEventListener = vi.fn().mockImplementation((event, callback) => {
        if (event === 'error') {
          callback(new Error('Failed to load image'));
        }
      });

      await expect(getImageDimensions('invalid-url.jpg')).rejects.toThrow('Failed to load image');
    });
  });
}); 