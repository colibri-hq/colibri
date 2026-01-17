import { decode, encode } from "blurhash";

/**
 * Encodes a blur hash for a given image.
 *
 * @see https://blurha.sh/
 */
export async function encodeImageToBlurHash(
  buffer: File | Blob | ArrayBuffer,
  context: { width: number; height: number },
): Promise<string>;
export async function encodeImageToBlurHash(
  buffer: File | Blob | ArrayBuffer | HTMLImageElement,
  context: CanvasDrawImage & CanvasImageData,
): Promise<string>;
export async function encodeImageToBlurHash(
  buffer: File | Blob | ArrayBuffer | HTMLImageElement,
  context: (CanvasDrawImage & CanvasImageData) | { width: number; height: number },
): Promise<string> {
  buffer = buffer instanceof ArrayBuffer ? new Blob([buffer]) : buffer;
  let data: Uint8ClampedArray;
  let width: number;
  let height: number;

  if ("width" in context && "height" in context) {
    ({ width, height } = context);

    if (!("bytes" in buffer)) {
      throw new Error("Unsupported usage: encodeImageToBlurHash requires a canvas context");
    }

    data = Uint8ClampedArray.from(await buffer.bytes());
  } else {
    const bitmap = await createImageBitmap(buffer, {});
    context.drawImage(bitmap, 0, 0);
    ({ data, width, height } = context.getImageData(0, 0, bitmap.width, bitmap.height));
  }

  return encode(data, width, height, 4, 3);
}

export async function decodeBlurHashToImage(
  hash: string,
  _resolution: number = 32,
): Promise<Blob | null> {
  const pixels = decode(hash, 242, 415);
  const canvas = document.createElement("canvas");
  const { width, height } = canvas;
  const context = canvas.getContext("2d") as CanvasRenderingContext2D;
  const imageData = context.createImageData(width, height);

  imageData.data.set(pixels);
  context.putImageData(imageData, 0, 0);

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob)));
}
