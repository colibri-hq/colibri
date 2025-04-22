export function arrayBufferToHex(buffer: ArrayBufferLike | Uint8Array<ArrayBuffer>) {
  // @ts-ignore
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

export function createStreamFromArrayBuffer(
  buffer: ArrayBuffer,
  chunkSize = 64 * 1024,
): ReadableStream<Uint8Array<ArrayBuffer>> {
  return new ReadableStream({
    start(controller) {
      const bytes = new Uint8Array(buffer);

      for (let readIndex = 0; readIndex < bytes.byteLength;) {
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
