import type { WorkerMessage } from "$lib/workers/workers";
import {
  createArrayBufferFromStream,
  encodeImageToBlurHash,
  getImageDimensions,
} from "@colibri-hq/shared";

onmessage = async ({ data }: MessageEvent<WorkerMessage>) => {
  const transfer: Transferable[] = [];
  let response: WorkerMessage;

  switch (data.type) {
    case "dimensions":
      response = {
        type: "dimensions",
        payload: await dimensions(data.payload as DimensionsRequest),
      };
      break;

    case "blurhash":
      response = {
        type: "blurhash",
        payload: await blurhash(data.payload as BlurhashRequest),
      };
      break;

    default:
      throw new Error(`Unhandled message type ${data.type}`);
  }

  postMessage(response, { transfer });
};

async function dimensions({
  image,
}: DimensionsRequest): Promise<DimensionsResponse> {
  const data =
    image instanceof ReadableStream
      ? await createArrayBufferFromStream(image)
      : image;
  const { width, height } = await getImageDimensions(data);

  return { width, height };
}

export interface DimensionsRequest {
  image: ArrayBuffer | ReadableStream;
}

export interface DimensionsResponse {
  width: number;
  height: number;
}

async function blurhash({
  canvas,
  data,
}: BlurhashRequest): Promise<BlurhashResponse> {
  const context = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
  const hash = await encodeImageToBlurHash(data, context);

  return { hash };
}

export interface BlurhashRequest {
  canvas: OffscreenCanvas;
  data: ArrayBuffer;
}

export interface BlurhashResponse {
  hash: string;
}
