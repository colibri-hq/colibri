import { browser, dev } from '$app/environment';
import type { PaginationData } from '$lib/trpc/client';
import type { Context } from '$lib/trpc/context';
import { auth } from '$lib/trpc/middleware/auth';
import { logger } from '$lib/trpc/middleware/logger';
import { initTRPC } from '@trpc/server';
import { z, type ZodRawShape } from 'zod';

export const t = initTRPC.context<Context>().create({
  isServer: !browser,
  isDev: dev,
  // errorFormatter: ({ shape, type, path }) => {
  //   return {
  //     ...shape,
  //     data: {
  //       ...shape.data,
  //       type,
  //       path,
  //     },
  //   };
  // },
});

export type Trpc = typeof t;

export function procedure(guarded: boolean = true) {
  return t.procedure.meta({ guarded }).use(logger(t)).use(auth(t));
}

export function unguardedProcedure() {
  return procedure(false);
}

export function paginatable<T extends ZodRawShape>(shape: T) {
  return z.object({
    ...shape,
    page: z.number().int().positive().optional(),
    perPage: z.number().int().positive().optional(),
  });
}

export async function paginatedResults<
  T extends Record<string, unknown> & { _pagination: PaginationData },
>(
  maybeResults: T[] | Promise<T[]>,
): Promise<[Omit<T, '_pagination'>[], PaginationData]> {
  const results = await maybeResults;
  const pagination = results.at(0)?._pagination || {
    page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
  };
  const items = results.map((result: Omit<T, '_pagination'>) => {
    delete result._pagination;

    return result;
  });

  return [items, pagination];
}
