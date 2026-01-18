import type { Server as HttpServer } from "node:http";
import type { Http2SecureServer, Http2Server } from "node:http2";
import type { Server as HttpsServer } from "node:https";
import type { ReadableStreamController } from "node:stream/web";
import cors from "@fastify/cors";
import formBody from "@fastify/formbody";
import fastify, {
  type FastifyReply,
  type FastifyRequest,
  type RouteGenericInterface,
} from "fastify";
import Stream, { Readable } from "node:stream";
import { vi } from "vitest";
import { type AuthorizationServerOptions, createAuthorizationServer } from "../src/index.js";

export async function createTestServer(options: AuthorizationServerOptions) {
  const app = fastify();

  // Register plugins
  await app.register(cors);
  await app.register(formBody);

  // Create and configure the OAuth server
  const oauthServer = createAuthorizationServer(options);

  // Register OAuth routes
  app.route({
    method: "GET",
    url: "/authorize",
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const response = await oauthServer.handleAuthorizationRequest(
        createRequest(request, reply),
        "user",
      );

      return reply.status(response.status).send(response.body);
    },
  });

  app.route({
    method: "POST",
    url: "/token",
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const response = await oauthServer.handleTokenRequest(createRequest(request, reply));

      return sendResponse(reply, response);
    },
  });

  // Attach the OAuth server instance to the Fastify app for testing purposes
  return app.decorate("oauth", oauthServer);
}

export function createMockPersistence() {
  return {
    loadClient: vi.fn(),
    loadAccessToken: vi.fn(),
    revokeAccessToken: vi.fn(),
    revokeRefreshToken: vi.fn(),
    loadAuthorizationRequest: vi.fn(),
    storeAuthorizationRequest: vi.fn(),
    storeDeviceChallenge: vi.fn(),
    loadDeviceChallenge: vi.fn(),
    issueTokens: vi.fn(),
    storeAuthorizationCode: vi.fn(),
    loadAuthorizationCode: vi.fn(),
    validateScope: vi.fn(),
    loadScopes: vi.fn(),
    loadTokenInfo: vi.fn(),
  };
}

// region Request & Response Bridge
export function createRequest<Server extends AnyHttpServer>(
  request: FastifyRequest<RouteGenericInterface, Server>,
  reply: FastifyReply<RouteGenericInterface, Server>,
): Request {
  const url = getUrl(request);

  let controller: AbortController | null = new AbortController();

  const init: RequestInit = {
    method: request.method,
    headers: createHeaders(request.headers),
    signal: controller.signal,
  };

  // Abort action/loaders once we can no longer write a response if we have
  // not yet sent a response (i.e., `close` without `finish`)
  // `finish` -> done rendering the response
  // `close` -> response can no longer be written to
  reply.raw.on("finish", () => (controller = null));
  reply.raw.on("close", () => controller?.abort());

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = createReadableStreamFromReadable(request.raw);
    init.duplex = "half";
  }

  return new Request(url, init);
}

export async function sendResponse<Server extends AnyHttpServer>(
  reply: FastifyReply<RouteGenericInterface, Server>,
  response: Response,
) {
  reply.status(response.status);

  for (const [key, values] of response.headers.entries()) {
    reply.headers({ [key]: values });
  }

  if (response.body) {
    const stream = responseToReadable(response.clone());
    return reply.send(stream);
  }

  return reply.send(await response.text());
}

function responseToReadable(response: Response) {
  if (!response.body) {
    return null;
  }

  const reader = response.body.getReader();
  const readable = new Readable();
  readable._read = async () => {
    try {
      const result = await reader.read();
      if (!result.done) {
        readable.push(Buffer.from(result.value));
      } else {
        readable.push(null);
      }
    } catch (error) {
      readable.destroy(error as Error);
      throw error;
    }
  };

  return readable;
}

function createHeaders(requestHeaders: FastifyRequest["headers"]) {
  const headers = new Headers();

  for (const [key, values] of Object.entries(requestHeaders)) {
    if (values) {
      if (Array.isArray(values)) {
        for (const value of values) {
          headers.append(key, value);
        }
      } else {
        headers.set(key, values);
      }
    }
  }

  return headers;
}

function getUrl<Server extends AnyHttpServer>(
  request: FastifyRequest<RouteGenericInterface, Server>,
) {
  const origin = `${request.protocol}://${request.host}`;

  return `${origin}${request.originalUrl}`;
}

const createReadableStreamFromReadable = (
  source: Readable & { readableHighWaterMark?: number },
) => {
  const pump = new StreamPump(source);

  return new ReadableStream(pump, pump);
};

class StreamPump {
  public highWaterMark: number;

  public accumulatedSize: number;

  #stream: Stream & {
    readableHighWaterMark?: number;
    readable?: boolean;
    resume?: () => void;
    pause?: () => void;
    destroy?: (error?: Error) => void;
  };

  private _controller?: ReadableStreamController<Uint8Array>;

  public constructor(
    stream: Stream & {
      readableHighWaterMark?: number;
      readable?: boolean;
      resume?: () => void;
      pause?: () => void;
      destroy?: (error?: Error) => void;
    },
  ) {
    this.highWaterMark =
      stream.readableHighWaterMark || new Stream.Readable().readableHighWaterMark;

    this.accumulatedSize = 0;
    this.#stream = stream;
    this.enqueue = this.enqueue.bind(this);
    this.error = this.error.bind(this);
    this.close = this.close.bind(this);
  }

  public size(chunk: Uint8Array) {
    return chunk?.byteLength || 0;
  }

  public start(controller: ReadableStreamController<Uint8Array>) {
    this._controller = controller;
    this.#stream.on("data", this.enqueue);
    this.#stream.once("error", this.error);
    this.#stream.once("end", this.close);
    this.#stream.once("close", this.close);
  }

  public cancel(reason?: Error) {
    if (this.#stream.destroy) {
      this.#stream.destroy(reason);
    }

    this.#stream.off("data", this.enqueue);
    this.#stream.off("error", this.error);
    this.#stream.off("end", this.close);
    this.#stream.off("close", this.close);
  }

  public enqueue(chunk: Uint8Array | string) {
    if (!this._controller) {
      return;
    }

    try {
      // noinspection SuspiciousTypeOfGuard
      const bytes = chunk instanceof Uint8Array ? chunk : Buffer.from(chunk);

      const available = (this._controller.desiredSize || 0) - bytes.byteLength;
      // @ts-expect-error -- Web Streams typings are incomplete
      this._controller.enqueue(bytes);

      if (available <= 0) {
        this.pause();
      }
    } catch (cause) {
      this._controller.error(
        new Error(
          "Could not create Buffer, chunk must be of type string or an instance of '+" +
            "'Buffer, ArrayBuffer, or Array or an Array-like Object",
          { cause },
        ),
      );

      this.cancel();
    }
  }

  public pause() {
    if (this.#stream.pause) {
      this.#stream.pause();
    }
  }

  public resume() {
    if (this.#stream.readable && this.#stream.resume) {
      this.#stream.resume();
    }
  }

  public close() {
    if (this._controller) {
      this._controller.close();
      delete this._controller;
    }
  }

  public error(error: Error) {
    if (this._controller) {
      this._controller.error(error);
      delete this._controller;
    }
  }
}

type AnyHttpServer = HttpServer | HttpsServer | Http2Server | Http2SecureServer;
// endregion
