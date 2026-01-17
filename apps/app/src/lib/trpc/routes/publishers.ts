import { procedure, t, unguardedProcedure } from "$lib/trpc/t";
import {
  createPublisher,
  listPublishers,
  loadWorksForPublisher,
  loadCreatorsForPublisher,
  loadPublisher,
  updatePublisher,
} from "@colibri-hq/sdk";
import { z } from "zod";

export const publishers = t.router({
  list: procedure()
    .input(z.string().optional())
    .query(({ input, ctx: { database } }) => listPublishers(database, input)),

  load: procedure()
    .input(z.string())
    .query(({ input, ctx: { database } }) => loadPublisher(database, input)),

  loadBooksForPublisher: procedure()
    .input(z.string())
    .query(({ input, ctx: { database } }) => loadWorksForPublisher(database, input)),

  loadCreatorsForPublisher: procedure()
    .input(z.string())
    .query(({ input, ctx: { database } }) => loadCreatorsForPublisher(database, input)),

  save: procedure()
    .input(
      z.object({
        id: z.string().nullable().optional(),
        name: z.string().min(3).max(50).optional(),
        description: z.string().optional(),
        wikipediaUrl: z.string().optional(),
      }),
    )
    .mutation(
      async ({ input: { id, name, description, wikipediaUrl }, ctx: { database, userId } }) => {
        if (id) {
          return updatePublisher(database, id, { name, description, wikipediaUrl });
        }

        return createPublisher(database, name || "Unknown Publisher", {
          description,
          wikipediaUrl,
          userId,
        });
      },
    ),

  fetchInfo: procedure()
    .input(z.string())
    .query(() => []),

  autocomplete: unguardedProcedure()
    .input(z.string())
    .query(async ({ input, ctx: { database } }) => {
      const publishers = await database
        .selectFrom("publisher")
        .select(["id", "name"])
        .where("name", "ilike", `%${input}%`)
        .orderBy("name", "desc")
        .execute();
      return publishers;
    }),
});
