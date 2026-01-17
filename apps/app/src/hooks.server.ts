import type { Handle } from "@sveltejs/kit";
import { dev } from "$app/environment";
import { env } from "$env/dynamic/private";
import { log } from "$lib/logging";
import { authenticateApiRequest } from "$lib/server/api-auth";
import { createContext } from "$lib/trpc/context";
import { router } from "$lib/trpc/router";
import { initialize as database } from "@colibri-hq/sdk";
import { storage } from "@colibri-hq/sdk/storage";
import { sequence } from "@sveltejs/kit/hooks";
import { hrtime } from "node:process";
import { createTRPCHandle } from "trpc-sveltekit";

const handlers = [
  // region Database Connection in context
  async function handle({ event, resolve }) {
    // TODO: Accessing the environment variables dynamically here breaks
    //       prerendering currently; but reading them from the static env means
    //       we'd need to build the app against a specific database URL.
    //       This may not be what we want; investigation pending.
    Object.defineProperty(event.locals, "database", {
      get() {
        return database(env.DB_URL, { certificate: env.DATABASE_CERTIFICATE, debug: dev });
      },
    });
    Object.defineProperty(event.locals, "storage", {
      get() {
        return storage(event.locals.database);
      },
    });

    return resolve(event);
  },
  // endregion

  // region API Authentication (for /api/* routes)
  async function apiAuth({ event, resolve }) {
    // Only authenticate API routes
    if (event.url.pathname.startsWith("/api/")) {
      const auth = await authenticateApiRequest(
        event.request,
        event.locals.database,
        event.cookies,
      );

      if (auth) {
        event.locals.apiAuth = auth;
      }
    }

    return resolve(event);
  },
  // endregion

  // region tRPC setup
  createTRPCHandle({
    router,
    createContext,
    onError: dev
      ? ({ error, type, path }) => {
          const stack = error.stack?.split("\n").slice(1).join("\n") ?? "(no stack trace)";
          const message = `${path}: ${error.message}\n${stack}`;

          log(`trpc:${type}`, "error", message);
        }
      : () => {},
  }),
  // endregion
] satisfies Handle[];

// region Request Logger (Development only)
if (dev) {
  const logRequest = async function logRequest({ event, resolve }) {
    const start = hrtime.bigint();
    const uri = event.url.toString().replace(event.url.origin, "");
    const response = await resolve(event);
    const duration = (Number(hrtime.bigint() - start) / 1e6).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    log("http:request", "debug", `${event.request.method} ${uri} \x1b[2m(${duration}ms)\x1b[0m`);

    return response;
  } satisfies Handle;

  handlers.unshift(logRequest);
}
// endregion

export const handle = sequence(...handlers);
