import { procedure, t, unguardedProcedure } from "$lib/trpc/t";
import {
  countSeries,
  loadSeriesById,
  loadSeriesForWork,
  loadSeriesWithWorkCount,
  loadSeriesWorks,
} from "@colibri-hq/sdk";
import { z } from "zod";

export const series = t.router({
  /**
   * List all series with work counts, paginated
   */
  list: procedure()
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        perPage: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(
      async ({
        input: { page, perPage },
        ctx: { database },
      }): Promise<
        [
          Awaited<ReturnType<typeof loadSeriesWithWorkCount>>,
          { page: number; per_page: number; total: number; last_page: number },
        ]
      > => {
        const [items, total] = await Promise.all([
          loadSeriesWithWorkCount(database, page, perPage),
          countSeries(database),
        ]);

        const lastPage = Math.ceil(total / perPage);

        return [
          items,
          {
            page,
            per_page: perPage,
            total,
            last_page: lastPage,
          },
        ];
      },
    ),

  /**
   * Load a single series by ID
   */
  get: procedure()
    .input(z.object({ id: z.string() }))
    .query(async ({ input: { id }, ctx: { database } }) =>
      loadSeriesById(database, id),
    ),

  /**
   * Load all works in a series, ordered by position
   */
  getWorks: procedure()
    .input(z.object({ seriesId: z.string() }))
    .query(async ({ input: { seriesId }, ctx: { database } }) =>
      loadSeriesWorks(database, seriesId),
    ),

  /**
   * Get all series that contain a specific work
   */
  getForWork: procedure()
    .input(z.object({ workId: z.string() }))
    .query(async ({ input: { workId }, ctx: { database } }) =>
      loadSeriesForWork(database, workId),
    ),

  /**
   * Search series by name for autocomplete
   */
  autocomplete: unguardedProcedure()
    .input(z.string())
    .query(async ({ input, ctx: { database } }) => {
      const results = await database
        .selectFrom("series")
        .select(["id", "name"])
        .where("name", "ilike", `%${input}%`)
        .orderBy("name", "asc")
        .limit(10)
        .execute();
      return results;
    }),
});
