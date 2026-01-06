import { t, unguardedProcedure } from "$lib/trpc/t";
import { searchAll, searchTypes } from "@colibri-hq/sdk";
import { z } from "zod";

export const search = t.router({
  /**
   * Unified search across editions, creators, publishers, and collections.
   * Uses PostgreSQL full-text search with tsvector columns.
   */
  query: unguardedProcedure()
    .input(
      z.object({
        query: z.string().min(1).max(200),
        types: z.array(z.enum(searchTypes)).optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ input, ctx: { database } }) => {
      const { query, types, limit } = input;
      return searchAll(database, query, { types, limit });
    }),
});
