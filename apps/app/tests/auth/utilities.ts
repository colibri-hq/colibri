import { log } from "$lib/logging";
import type { MaybePromise } from "@sveltejs/kit";
import { createHash } from "node:crypto";
import { createServer, type IncomingMessage, type Server } from "node:http";
import { Readable } from "node:stream";

// region HTTP Responder
type ServerHandler = (request: Request) => MaybePromise<Response | void>;

export function createHttpResponder(
  port: number,
  handlers: Record<`/${string}`, ServerHandler>,
) {
  function getBody(request: IncomingMessage) {
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Uint8Array[] = [];

      request.on("error", (error) => reject(error));
      request.on("end", () => resolve(Buffer.concat(chunks)));
      request.on("data", (chunk: Uint8Array) => {
        chunks.push(chunk);
      });
    });
  }

  return new Promise<Server>((resolve, reject) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url!, `http://${req.headers.host}`);

      for (const [uri, handle] of Object.entries(handlers)) {
        if (url.pathname !== uri) {
          continue;
        }

        const method = req.method || "GET";
        const request = new Request(url, {
          method,
          body: method !== "GET" ? await getBody(req) : null,
          headers: Object.entries(req.headers).filter(
            (header): header is [string, string] => !!header[1],
          ),
        });

        const result = handle ? await handle(request) : undefined;

        if (result instanceof Response) {
          res.writeHead(
            result.status,
            result.statusText,
            [...result.headers],
            //result.headers ? Array.from(result.headers.entries()) : undefined,
          );

          if (result.body) {
            // @ts-expect-error -- Works, but not documented
            Readable.fromWeb(result.body).pipe(res);
          } else {
            res.end();
          }
          //     res.end(await result.text());

          return;
        }

        if (!res.writableEnded) {
          res.writeHead(200);
          res.end();
        }

        return;
      }

      res.writeHead(404);
      res.end();
    });

    server.on("request", (req) =>
      log("test:listener", "info", `Received request for ${req.url}`),
    );
    server.on("error", (error) => reject(error));
    server.listen(port, () => {
      log("test:listener", "info", `Test server listening on port ${port}`);
      resolve(server);
    });
  });
}
// endregion

// region PKCE Challenges
export function generateCodeVerifierAndChallenge(secret = "foobar") {
  const codeVerifier = Buffer.from(secret);
  const codeChallenge = createHash("sha256").update(codeVerifier).digest();

  return [
    codeVerifier.toString("base64url"),
    codeChallenge.toString("base64url"),
  ] as const;
}
// endregion

// region Parameter Overrides
export type OverrideOption<T, V = Record<string, unknown>> =
  | T
  | ((context: V) => Partial<T>);

export function override<T extends Record<string, unknown>, V>(
  defaults: T,
  override: OverrideOption<T, V> | undefined,
  context: V,
) {
  const overrideFunction =
    override && typeof override === "function"
      ? override
      : () => override ?? ({} as Partial<T>);

  return transformingDeepMerge(defaults, overrideFunction(context));
}

function removeOmittedProps<T extends Record<string, unknown>>(
  properties: T,
): Required<T> {
  return Object.fromEntries(
    Object.entries(properties).filter(
      (entry): entry is [string, Exclude<T[keyof T], undefined>] =>
        typeof entry[1] !== "undefined",
    ),
  ) as Required<T>;
}

function transformingDeepMerge<
  T extends Record<string, unknown>,
  U extends Record<string, unknown>,
>(target: T, source: U) {
  const result = { ...target, ...source };

  for (const key of Object.keys(result)) {
    const value =
      isObject(target[key]) && isObject(source[key])
        ? transformingDeepMerge(
            target[key] as Record<string, unknown>,
            source[key] as Record<string, unknown>,
          )
        : structuredClone(result[key]);

    // @ts-expect-error -- Fixing this is not worth the trouble, it's just a typing issue
    result[key] = isObject(value) ? removeOmittedProps(value) : value;
  }

  return removeOmittedProps(result);
}

function isObject<T extends Record<string, unknown>>(obj: unknown): obj is T {
  if (typeof obj === "object" && obj !== null) {
    if (typeof Object.getPrototypeOf === "function") {
      const prototype = Object.getPrototypeOf(obj);
      return prototype === Object.prototype || prototype === null;
    }

    return Object.prototype.toString.call(obj) === "[object Object]";
  }

  return false;
}
// endregion
