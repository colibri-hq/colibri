import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getImageDimensions } from './dimensions.js';

describe('Images', () => {
  describe('Dimensions', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    describe('getImageDimensions', () => {
      it('should get dimensions from URL string', async () => {
        const result = await getImageDimensions(
          'https://example.com/image.jpg',
        );

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
        mockImage.addEventListener = vi
          .fn()
          .mockImplementation((event, callback) => {
            if (event === 'error') {
              callback(new Error('Failed to load image'));
            }
          });

        await expect(getImageDimensions('invalid-url.jpg')).rejects.toThrow(
          'Failed to load image',
        );
      });
    });
  });
});
