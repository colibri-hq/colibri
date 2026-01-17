import { paginatable, paginatedResults, procedure, t, unguardedProcedure } from "$lib/trpc/t";
import {
  createCreator,
  deleteCreator,
  loadContributionsForCreator,
  loadCreator,
  loadCreators,
  updateCreator,
} from "@colibri-hq/sdk";
import { z } from "zod";

export const creators = t.router({
  list: procedure()
    .input(paginatable({}))
    .query(async ({ input: { page, perPage }, ctx: { database } }) =>
      paginatedResults(loadCreators(database, page, perPage)),
    ),

  load: procedure()
    .input(z.object({ id: z.string() }))
    .query(async ({ input: { id }, ctx: { database } }) => loadCreator(database, id)),

  loadContributions: procedure()
    .input(z.object({ id: z.string() }))
    .query(async ({ input: { id }, ctx: { database } }) =>
      loadContributionsForCreator(database, id),
    ),

  autocomplete: unguardedProcedure()
    .input(z.string())
    .query(async ({ input, ctx: { database } }) => {
      const creators = await database
        .selectFrom("creator")
        .select(["id", "name"])
        .where("name", "ilike", `%${input}%`)
        .orderBy("name", "desc")
        .execute();
      return creators;
    }),

  loadOptions: procedure().query(async ({ ctx: { database } }) => {
    const creators = await database
      .selectFrom("creator")
      .select(["id", "name"])
      .orderBy("name", "asc")
      .execute();
    return creators.map(({ id, name }) => ({ label: name, value: id }));
  }),

  update: procedure()
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(3).max(50).optional(),
        description: z.string().optional(),
        wikipediaUrl: z.string().optional(),
      }),
    )
    .mutation(async ({ input: { id, ...data }, ctx: { database, userId } }) => {
      await updateCreator(database, id, { ...data, userId });
    }),

  save: procedure()
    .input(
      z.object({
        id: z.string().nullable(),
        name: z.string().min(3).max(50),
        description: z.string().nullable(),
      }),
    )
    .mutation(async ({ input: { id, name, description }, ctx: { database, userId } }) => {
      if (id) {
        await updateCreator(database, id, { name, description: description ?? undefined, userId });
      } else {
        await createCreator(database, name, { description: description ?? undefined, userId });
      }
    }),

  delete: procedure()
    .input(z.string())
    .mutation(async ({ input: id, ctx: { database } }) => {
      await deleteCreator(database, id);
    }),
});
