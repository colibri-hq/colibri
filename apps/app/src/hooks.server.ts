import { dev } from '$app/environment';
import { DATABASE_CERTIFICATE, DB_URL } from '$env/static/private';
import { log } from '$lib/logging';
import { createContext } from '$lib/trpc/context';
import { router } from '$lib/trpc/router';
import { initialize } from '@colibri-hq/sdk';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { hrtime } from 'node:process';
import { createTRPCHandle } from 'trpc-sveltekit';

const handlers = [
  // region Database Connection in context
  async function handle({ event, resolve }) {
    event.locals.database = initialize(DB_URL, {
      certificate: DATABASE_CERTIFICATE,
      debug: dev,
    });

    return resolve(event);
  },
  // endregion

  // region tRPC setup
  createTRPCHandle({
    router,
    createContext,
    onError: dev
      ? ({ error, type, path }) => {
          const stack =
            error.stack?.split('\n').slice(1).join('\n') ?? '(no stack trace)';
          const message = `${path}: ${error.message}\n${stack}`;

          log(`trpc:${type}`, 'error', message);
        }
      : () => {},
  }),
  // endregion
] satisfies Handle[];

// region Request Logger (Development only)
if (dev) {
  const logRequest: Handle = async function logRequest({ event, resolve }) {
    const start = hrtime.bigint();
    const uri = event.url.toString().replace(event.url.origin, '');
    const response = await resolve(event);
    const duration = (Number(hrtime.bigint() - start) / 1e6).toLocaleString(
      undefined,
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    );

    log(
      'http:request',
      'debug',
      `${event.request.method} ${uri} \x1b[2m(${duration}ms)\x1b[0m`,
    );

    return response;
  };

  handlers.unshift(logRequest);
}
// endregion

export const handle = sequence(...handlers);
