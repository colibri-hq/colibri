export function arrayBufferToHex(
  buffer: ArrayBufferLike | Uint8Array<ArrayBuffer>,
) {
  // @ts-expect-error -- Buffer conversion works as intended
  return Array.from(new Uint8Array(buffer)).reduce(
    (acc, byte) => acc + byte.toString(16).padStart(2, '0'),
    '',
  );
}

export function hexToArrayBuffer(hex: string): ArrayBuffer {
  const { buffer } = Uint8Array.from(
    hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
  );

  return buffer;
}

export function createStreamFromArrayBuffer<
  T extends ArrayBuffer | ArrayBufferLike,
>(buffer: T, chunkSize = 64 * 1024): ReadableStream<Uint8Array<T>> {
  return new ReadableStream({
    start(controller) {
      const bytes = new Uint8Array(buffer);

      for (let readIndex = 0; readIndex < bytes.byteLength; ) {
        controller.enqueue(bytes.subarray(readIndex, (readIndex += chunkSize)));
      }

      controller.close();
    },
  });
}

export async function createArrayBufferFromStream(
  stream: ReadableStream<Uint8Array>,
): Promise<ArrayBuffer> {
  let result = new Uint8Array(0);
  const reader = stream.getReader();

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    const newResult = new Uint8Array(result.length + value.length);

    newResult.set(result);
    newResult.set(value, result.length);

    result = newResult;
  }

  return result.buffer;
}
