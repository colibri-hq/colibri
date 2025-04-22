import { decode, encode } from 'blurhash';

/**
 * Encodes a blur hash for a given image.
 *
 * @see https://blurha.sh/
 */
export async function encodeImageToBlurHash(
  buffer: Blob | ArrayBuffer | HTMLImageElement,
  context: CanvasDrawImage & CanvasImageData,
): Promise<string> {
  buffer = buffer instanceof ArrayBuffer ? new Blob([buffer]) : buffer;
  const bitmap = await createImageBitmap(buffer, {});

  context.drawImage(bitmap, 0, 0);

  const { data, width, height } = context.getImageData(
    0,
    0,
    bitmap.width,
    bitmap.height,
  );

  return encode(data, width, height, 4, 3);
}

export async function decodeBlurHashToImage(
  hash: string,
  _resolution: number = 32,
): Promise<Blob | null> {
  const pixels = decode(hash, 242, 415);
  const canvas = document.createElement('canvas');
  const { width, height } = canvas;
  const context = canvas.getContext('2d') as CanvasRenderingContext2D;
  const imageData = context.createImageData(width, height);

  imageData.data.set(pixels);
  context.putImageData(imageData, 0, 0);

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob)));
}

export async function getImageDimensions(image: string | ArrayBuffer): Promise<{
  width: number;
  height: number
}> {
  if (typeof image === 'string') {
    return new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.src = image;

      img.addEventListener('error', (error) => reject(error));
      img.addEventListener('load', () =>
        resolve({
          width: img.width,
          height: img.height,
        }),
      );
    });
  }

  const { width, height } = await createImageBitmap(new Blob([image]), {});

  return { width, height };
}
